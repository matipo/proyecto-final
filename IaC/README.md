# NULL_TRADE — Infraestructura como Código

Infraestructura cloud para una plataforma de compraventa de videojuegos, definida completamente con Terraform y desplegada en AWS.

---

## Arquitectura general

```
Usuario → CloudFront (CDN + SSL) → ALB → ECS Fargate (nginx + SPA)
                                              ↓
                                     API Gateway HTTP API
                                              ↓
                                       Lambda → DynamoDB
```

El tráfico sigue esta ruta:
1. **CloudFront** termina SSL y redirige HTTP a HTTPS. El origen apunta al ALB, restringido mediante prefix list de CloudFront.
2. **ALB** distribuye las peticiones entre las tareas ECS en 2 zonas de disponibilidad, con health checks cada 30 segundos.
3. **ECS Fargate** ejecuta nginx sirviendo la SPA compilada. El contenedor genera un `config.js` con la URL de la API al iniciar.
4. **API Gateway HTTP API** enruta 6 rutas (GET/POST) hacia 3 funciones Lambda, con CORS habilitado.
5. **Lambda** (Python 3.12) procesa la lógica de negocio: catálogo de juegos, comunidad y checkout.
6. **DynamoDB** almacena todos los datos en una tabla única con partición por `id` y discriminador `type`.

---

## Componentes de infraestructura

### Red — VPC

| Elemento | Descripción |
|---|---|
| VPC | 10.0.0.0/16 |
| Subnets | 2 públicas en `us-east-1a` y `us-east-1b` (multi-AZ) |
| Internet Gateway | Salida a internet para los recursos de la VPC |
| Route Table | 0.0.0.0/0 → Internet Gateway |
| Security Group ALB | Inbound: HTTP :80 desde CloudFront (managed prefix list). Outbound: todo |
| Security Group ECS | Inbound: HTTP :80 desde el SG del ALB. Outbound: todo |
| Security Group VPC Endpoints | Inbound: HTTPS :443 desde el SG de ECS |

VPC Endpoints para mantener el tráfico de AWS dentro de la red de AWS sin costo:
- **DynamoDB** (Gateway) — sin costo, tráfico por backbone AWS
- **S3** (Gateway) — sin costo, necesario para capas de ECR
- **ECR Docker** (Interface) — pull de imágenes sin salir a internet
- **ECR API** (Interface) — metadatos del repositorio

### Balanceo y CDN — ALB + CloudFront

| Componente | Detalle |
|---|---|
| ALB | Público, listener HTTP:80, origen de CloudFront |
| Target Group | Health check cada 30s, HTTP :80 |
| CloudFront | CDN con SSL (certificado wildcard ACM), HTTP→HTTPS, `PriceClass_100` (Norteamérica), compresión habilitada, caching deshabilitado |

CloudFront protege el ALB: este solo acepta tráfico desde las IP de CloudFront mediante un managed prefix list.

### Cómputo — ECS Fargate

| Parámetro | Valor |
|---|---|
| Tipo | Fargate (serverless, sin gestión de servidores) |
| CPU | 256 (0.25 vCPU) |
| Memoria | 512 MB |
| Tareas | 2 (mínimo), 4 (máximo) |
| Auto-scaling | Target tracking al 60% de CPU |
| Imagen | nginx:1.27-alpine con la SPA compilada en `null-trade/dist/` |
| Roles IAM | Rol de ejecución: pull de ECR + envío de logs a CloudWatch. Rol de tarea: acceso a DynamoDB |

### API — API Gateway + Lambda

| Ruta | Método | Lambda |
|---|---|---|
| `/games` | GET | `games_handler` — lista juegos (type=GAME) |
| `/games/{id}` | GET | `games_handler` — detalle de un juego |
| `/community` | GET | `community_handler` — lista cuentas, skins y trades |
| `/community` | POST | `community_handler` — crea publicación comunitaria |
| `/checkout` | GET | `checkout` — historial de órdenes |
| `/checkout` | POST | `checkout` — registra una orden de compra |

Las funciones Lambda comparten un rol IAM con permisos de solo lectura/escritura sobre la tabla DynamoDB del proyecto.

### Base de datos — DynamoDB

| Parámetro | Valor |
|---|---|
| Modalidad | PAY_PER_REQUEST (pago por uso, sin aprovisionamiento) |
| Clave de partición | `id` (String) |
| Discriminador | `type` (GAME, ACCOUNT, SKIN, TRADE, ORDER) |
| Diseño | Single-table: todos los tipos de entidad en una misma tabla |

### Repositorio de imágenes — ECR

Repositorio Docker privado con escaneo automático de vulnerabilidades al subir imágenes.

### Monitoreo — CloudWatch

Logs del contenedor ECS con retención de 30 días. Alerta de presupuesto mensual notificando al 80% de $20 USD.

---

## Estructura del proyecto

```
IaC/
├── main.tf                 # Punto de entrada: invoca los 6 módulos + budget
├── variables.tf            # Variables de entrada (región, CIDRs, nombres)
├── outputs.tf              # Valores de salida (URLs, ARNs, endpoints)
├── providers.tf            # Configuración del proveedor AWS + tags automáticos
├── version.tf              # Versiones requeridas (Terraform >= 1.8, AWS ~> 6.0)
├── backend.tf              # Estado remoto en S3 + DynamoDB locking
├── terraform.tfvars.example# Valores de ejemplo para las variables
├── Dockerfile              # Construye la imagen nginx con la SPA compilada
├── nginx.conf              # Configuración de nginx (SPA con fallback a index.html)
├── docker-entrypoint.sh    # Genera config.js con API_URL en runtime
├── lambda/                 # Código fuente de las 3 funciones Lambda (Python 3.12)
│   ├── games_handler.py
│   ├── community_handler.py
│   └── checkout.py
├── null-trade/dist/        # Frontend compilado que se incluye en la imagen Docker
└── modules/                # Módulos Terraform reutilizables
    ├── network/            # VPC, subnets, IGW, SGs, VPC Endpoints
    ├── alb/                # ALB, Target Group, Listener, CloudFront
    ├── ecs/                # Cluster, Task Definition, Service, IAM, Auto Scaling
    ├── ecr/                # Repositorio Docker privado
    ├── database/           # Tabla DynamoDB single-table
    └── api/                # API Gateway HTTP API + 3 funciones Lambda
```

Cada módulo encapsula un componente con sus propias variables, recursos y salidas. Esto permite mantener, reutilizar y entender cada parte de forma independiente.

---

## Diseño de datos

| `id` (PK) | `type` | Atributos |
|---|---|---|
| `elden-ring` | GAME | title, price, platform, genre, image, description, developer, releaseYear, rating |
| `account-<uuid>` | ACCOUNT | title, platform, level, seller, price |
| `skin-<uuid>` | SKIN | title, game, rarity, seller, price |
| `trade-<uuid>` | TRADE | title, offer, want, user |
| `<uuid>` | ORDER | items[], total, status, created_at |

Las consultas se realizan mediante `scan` con `FilterExpression` sobre `type`. Para escalar a mayores volúmenes de datos se agregaría un Global Secondary Index sobre `type`.

---

## Seguridad

- **Mínimo privilegio**: roles IAM con permisos acotados al recurso específico (tabla DynamoDB, repositorio ECR, log group).
- **Aislamiento de red**: ALB solo accesible desde CloudFront (prefix list). ECS solo desde el ALB.
- **VPC Endpoints**: el tráfico hacia DynamoDB, S3 y ECR no atraviesa internet público.
- **Escaneo de imágenes**: ECR escanea vulnerabilidades automáticamente al hacer push.
- **Cifrado en tránsito**: CloudFront termina SSL. Tráfico interno por backbone AWS.
- **Tags**: todos los recursos etiquetados (Name, Project, Environment, ManagedBy) para trazabilidad.
- **Alerta de costos**: notificación por email al 80% de $20 USD/mes.

---

## Justificación de decisiones

| Decisión | Alternativa | Razón |
|---|---|---|
| DynamoDB PAY_PER_REQUEST | RDS | Sin costo en inactividad, escalado automático, sin mantenimiento. Los datos no requieren joins. |
| ECS Fargate | EC2 | Sin gestión de servidores. Costo competitivo (~$13 USD por 2 tareas 24/7). |
| API Gateway + Lambda | Servidor backend continuo | Paga por solicitud, escala a cero, sin costo base. Cold start aceptable. |
| CloudFront + ALB | Solo ALB | SSL gestionado, protección de origen, DDoS Shield, caching en edge. Costo marginal (~$1 USD/mes). |
| VPC Endpoints Gateway | NAT Gateway | Sin costo (~$32 USD/mes de ahorro). Tráfico por backbone AWS. |
| Single-table DynamoDB | Múltiples tablas | Una sola tabla on-demand. Sin joins necesarios. GSI como mejora futura. |

---

## Costos estimados

| Servicio | Costo mensual |
|---|---|
| ECS Fargate (2 tareas 24/7) | ~$13.14 |
| ALB | ~$10.95 |
| CloudFront | ~$1.05 |
| API Gateway | ~$1.00 |
| DynamoDB (PAY_PER_REQUEST) | ~$0.50 |
| CloudWatch Logs | ~$0.26 |
| ECR | ~$0.10 |
| Lambda, VPC Endpoints | $0.00 (Free Tier / sin costo) |
| **Total** | **~$27.00 USD/mes** |

Optimizaciones: DynamoDB on-demand (sin costo en inactividad), 2 tareas Fargate (mínimo viable para HA), CloudFront PriceClass_100 (~40% de ahorro), VPC Endpoints Gateway gratuitos en lugar de NAT Gateway (~$32 USD/mes de ahorro).

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Preact + Vite + Tailwind CSS + TypeScript |
| Servidor web | nginx:1.27-alpine (contenedorizado) |
| Orquestación | AWS ECS Fargate |
| API | AWS API Gateway HTTP API |
| Cómputo serverless | AWS Lambda (Python 3.12) |
| Base de datos | AWS DynamoDB (single-table, on-demand) |
| CDN | AWS CloudFront |
| Registro Docker | AWS ECR |
| Logs | AWS CloudWatch |
| IaC | Terraform >= 1.8, AWS Provider ~> 6.0 |
| Backend IaC | S3 (estado) + DynamoDB (locking) |
