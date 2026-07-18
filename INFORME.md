# INFORME TÉCNICO — NULL_TRADE

**Plataforma de compraventa de videojuegos · FDICI12 · Taller de Ingeniería Informática**
**Universidad de Los Lagos · Ingeniería Civil en Informática**

---

## Tabla de contenidos

1. [Contexto de negocio](#1-contexto-de-negocio)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Infraestructura cloud](#3-infraestructura-cloud)
4. [Justificación de decisiones técnicas](#4-justificación-de-decisiones-técnicas)
5. [Análisis de costos](#5-análisis-de-costos)
6. [Diagrama de infraestructura](#6-diagrama-de-infraestructura)
7. [Resultados](#7-resultados)
8. [Conclusiones](#8-conclusiones)

---

## 1. Contexto de negocio

NULL_TRADE es un marketplace chileno para la compra, venta e intercambio de videojuegos, cuentas, skins y activos digitales, operando en pesos chilenos (CLP). El proyecto surge de la necesidad de un mercado secundario confiable en Latinoamérica, donde los precios oficiales no tienen ajuste regional y no existe una plataforma centralizada para estos intercambios.

### Problema

- Precios elevados en tiendas oficiales sin ajuste regional consistente.
- Ausencia de un mercado secundario confiable para activos digitales.
- Falta de un espacio centralizado para oferta y demanda de videojuegos en el ecosistema local.

### Solución propuesta

- Catálogo de videojuegos con precios en CLP, búsqueda y filtros.
- Marketplace comunitario (cuentas, skins, trades).
- Carrito de compras, checkout e historial de órdenes.

---

## 2. Arquitectura del sistema

El sistema sigue una arquitectura cloud-native que combina **contenedores serverless** (ECS Fargate) para servir la SPA y **funciones serverless** (Lambda) para la capa de API, con una base de datos NoSQL administrada (DynamoDB).

### Vista general del flujo

```
Usuario → CloudFront (CDN + SSL) → ALB (balanceo) → ECS Fargate (nginx + SPA)
                                                         ↓
                                                API Gateway HTTP API
                                                         ↓
                                          Lambda ──→ DynamoDB (single-table)
```

- **CDN**: CloudFront termina SSL, redirige HTTP→HTTPS y protege el origen.
- **Balanceo**: ALB distribuye tráfico entre las tareas ECS en 2 AZ.
- **Cómputo**: ECS Fargate ejecuta nginx con la SPA compilada (2 tareas, auto-scaling).
- **API**: API Gateway HTTP API enruta 6 rutas a 3 funciones Lambda (Python 3.12).
- **Datos**: DynamoDB en modo PAY_PER_REQUEST con diseño de tabla única.

---

## 3. Infraestructura cloud

### 3.1 Red (VPC)

| Componente | Especificación |
|---|---|
| VPC | 10.0.0.0/16 |
| Subnets | 2 públicas (us-east-1a, us-east-1b) |
| Internet Gateway | Sí |
| Route Table | 0.0.0.0/0 → IGW |
| Security Group ALB | Inbound: solo CloudFront (prefix list), Outbound: todo |
| Security Group ECS | Inbound: solo ALB, Outbound: todo |
| VPC Endpoints | DynamoDB (Gateway), S3 (Gateway), ECR Docker (Interface), ECR API (Interface) |

### 3.2 Cómputo (ECS Fargate)

| Parámetro | Valor |
|---|---|
| Tipo | Fargate (serverless) |
| CPU | 256 unidades (0.25 vCPU) |
| Memoria | 512 MB |
| Tareas | 2 (mínimo), 4 (máximo) |
| Auto-scaling | Target CPU 60% |
| Imagen | nginx:1.27-alpine + SPA compilada |
| Logs | CloudWatch (retención 30 días) |

### 3.3 API (API Gateway + Lambda)

| Parámetro | Valor |
|---|---|
| Tipo | HTTP API |
| CORS | Activado |
| Funciones Lambda | 3 (games_handler, community_handler, checkout) |
| Runtime | Python 3.12 |
| Memoria Lambda | 128 MB |
| Permisos | IAM con acceso solo a DynamoDB (mínimo privilegio) |

### 3.4 Base de datos (DynamoDB)

| Parámetro | Valor |
|---|---|
| Modo | PAY_PER_REQUEST (on-demand) |
| Clave de partición | `id` (String) |
| Atributo discriminador | `type` (GAME, ACCOUNT, SKIN, TRADE, ORDER) |
| Diseño | Single-table |

### 3.5 CDN y balanceo (CloudFront + ALB)

| Componente | Rol |
|---|---|
| CloudFront | SSL termination, HTTP→HTTPS, origen apunta al ALB, PriceClass_100 |
| ALB | Público, listener HTTP:80, health check cada 30s, target group hacia ECS |

### 3.6 IaC (Terraform)

| Archivo | Propósito |
|---|---|
| `main.tf` | Orquestación de 6 módulos + alerta de presupuesto AWS |
| `providers.tf` | Provider AWS con tags automáticos (ManagedBy, Environment, Project) |
| `variables.tf` | 7 variables (region, project_name, environment, CIDRs, desired_count) |
| `outputs.tf` | 6 outputs (ALB DNS, CloudFront URL, VPC ID, ECR URL, DynamoDB ARN/name, API endpoint) |
| `backend.tf` | Estado remoto en S3 + DynamoDB locking |
| `version.tf` | Terraform >= 1.8, AWS provider ~> 6.0 |
| `modules/network/` | VPC, subnets, IGW, route tables, security groups, VPC endpoints |
| `modules/database/` | DynamoDB single-table |
| `modules/ecr/` | Repositorio Docker privado con escaneo |
| `modules/alb/` | ALB, target group, listener, CloudFront |
| `modules/api/` | API Gateway, 3 Lambda integrations, 6 routes, roles IAM |
| `modules/ecs/` | ECS cluster, task definition, service, auto-scaling, CloudWatch logs |

---

## 4. Justificación de decisiones técnicas

### 4.1 DynamoDB (PAY_PER_REQUEST) en lugar de RDS

| Criterio | DynamoDB | RDS (PostgreSQL) |
|---|---|---|
| Costo fijo | $0 (paga por uso) | ~$15 USD/mes mínimo |
| Escalado | Automático e ilimitado | Vertical, requiere aprovisionamiento |
| Mantenimiento | Cero (serverless) | Parches, backups, réplicas |
| **Decisión** | Datos del catálogo no requieren joins. DynamoDB tiene costo cero en inactividad y escala automáticamente, ideal para un proyecto académico. |

### 4.2 ECS Fargate en lugar de EC2 para servir la SPA

| Criterio | Fargate | EC2 |
|---|---|---|
| Gestión | Sin servidores (serverless) | OS, parches, seguridad |
| Costo 24/7 | ~$13 USD (2 tareas) | ~$17 USD (t3a.nano) |
| Escalado | Automático | Auto-scaling grupal |
| **Decisión** | Fargate elimina la sobrecarga operativa de EC2 con costo competitivo. Para servir archivos estáticos, no se necesita acceso al sistema operativo. |

### 4.3 API Gateway + Lambda en lugar de servidor backend tradicional

| Criterio | API Gateway + Lambda | Servidor (ECS/EC2) |
|---|---|---|
| Costo en baja carga | ~$0 (paga por solicitud) | Costo fijo 24/7 |
| Escalado | Automático, infinito | Auto-scaling configurado |
| Mantenimiento | Cero | Gestión de proceso, logs, reinicios |
| **Decisión** | Para APIs livianas con carga impredecible, serverless elimina el costo base. Cold start (~200 ms) es aceptable para el caso de uso. |

### 4.4 CloudFront + ALB en lugar de solo ALB

| Criterio | CloudFront + ALB | Solo ALB |
|---|---|---|
| SSL | Automático (ACM) | Requiere certificado manual |
| Protección de origen | ALB solo visible para CloudFront | ALB expuesto públicamente |
| DDoS | AWS Shield incluido | No protegido |
| Caching | Edge locations | No aplica |
| **Decisión** | CloudFront agreja seguridad, rendimiento y protección DDoS con costo marginal (~$1 USD/mes). El ALB queda oculto detrás de CloudFront. |

### 4.5 VPC Endpoints Gateway en lugar de NAT Gateway

| Criterio | VPC Endpoints (Gateway) | NAT Gateway |
|---|---|---|
| Costo | $0 | ~$32 USD/mes |
| Tráfico DynamoDB/S3 | Por AWS backbone (sin costo) | Por NAT (cobro por GB) |
| **Decisión** | Los VPC Endpoints Gateway para DynamoDB y S3 no tienen costo y mantienen el tráfico dentro de la red de AWS. |

### 4.6 Diseño single-table en DynamoDB

Todos los tipos de entidad (`GAME`, `ACCOUNT`, `SKIN`, `TRADE`, `ORDER`) coexisten en una misma tabla con `id` como PK y `type` como discriminador. Esto reduce la complejidad operativa a una sola tabla sin joins. Para producción se recomienda agregar un GSI sobre `type`.

---

## 5. Análisis de costos

### 5.1 Costos mensuales estimados (AWS us-east-1)

| Servicio | Componente | Costo mensual |
|---|---|---|
| **ECS Fargate** | 2 tareas (256 CPU / 512 MB), 24/7 | ~$13.14 |
| **ALB** | 1 ALB + 1 GB datos procesados | ~$10.95 |
| **CloudFront** | 10 GB transferencia + 1M solicitudes | ~$1.05 |
| **API Gateway** | 100K solicitudes REST | ~$1.00 |
| **DynamoDB** | PAY_PER_REQUEST | ~$0.50 |
| **CloudWatch** | Logs (5 GB) | ~$0.26 |
| **ECR** | Almacenamiento 1 imagen | ~$0.10 |
| **Lambda** | Free Tier | $0.00 |
| **VPC Endpoints** | Gateway sin costo | $0.00 |
| **NAT Gateway** | No implementado | $0.00 |
| **Total** | | **~$27.00 USD/mes** |

### 5.2 Optimizaciones aplicadas

| Optimización | Impacto |
|---|---|
| DynamoDB PAY_PER_REQUEST | Sin costo en periodos sin uso |
| 2 tareas Fargate (mínimo viable HA) | ~$13 USD vs. 3 tareas |
| CloudFront PriceClass_100 (solo EE.UU.) | ~40% vs. PriceClass_All |
| VPC Endpoints Gateway (gratuitos) | vs. NAT Gateway (~$32 USD/mes) |
| Sin RDS (DynamoDB on-demand) | ~$15+ USD/mes ahorrados |

### 5.3 AWS Free Tier aprovechado

Lambda (1M solicitudes/mes), DynamoDB (25 GB + 200M solicitudes/mes), CloudFront (1 TB/mes) y CloudWatch (5 GB) están dentro del Free Tier.

---

## 6. Diagrama de infraestructura

```
                    ┌──────────────────────────────────────────────┐
                    │              AWS us-east-1                   │
                    │                                              │
                    │  ┌────────────────────────────────────────┐  │
                    │  │         VPC (10.0.0.0/16)              │  │
                    │  │                                        │  │
                    │  │  ┌─────────┐    ┌─────────┐           │  │
                    │  │  │Subnet-A │    │Subnet-B │           │  │
                    │  │  │1a       │    │1b       │           │  │
                    │  │  │         │    │         │           │  │
                    │  │  │┌──────┐│    │┌──────┐│           │  │
                    │  │  ││ ECS  ││    ││ ECS  ││           │  │
                    │  │  ││ tarea││    ││ tarea││           │  │
                    │  │  ││  1   ││    ││  2   ││           │  │
                    │  │  │└──┬───┘│    │└──┬───┘│           │  │
                    │  │  └───┼────┘    └───┼────┘           │  │
                    │  │      │             │                 │  │
                    │  │      └──────┬──────┘                 │  │
                    │  │             │                        │  │
                    │  │     ┌───────┴────────┐               │  │
                    │  │     │  Target Group   │               │  │
                    │  │     └───────┬────────┘               │  │
                    │  │             │                        │  │
                    │  │     ┌───────┴────────┐               │  │
                    │  │     │  ALB (público) │               │  │
                    │  │     │  Listener :80  │               │  │
                    │  │     └───────┬────────┘               │  │
                    │  │             │                        │  │
                    │  │     ┌───────┴────────┐               │  │
                    │  │     │ Internet GW    │               │  │
                    │  │     └───────┬────────┘               │  │
                    │  └─────────────┼────────────────────────┘  │
                    │                │                           │
                    │       ┌────────┴────────┐                 │
                    │       │  CloudFront CDN  │                 │
                    │       │  (SSL + HTTP→   │                 │
                    │       │   HTTPS)        │                 │
                    │       └────────┬────────┘                 │
                    └────────────────┼──────────────────────────┘
                                     │ HTTPS
                                     ▼
                               ┌──────────┐
                               │ Usuario  │
                               │ (Browser)│
                               └──────────┘
```

### VPC Endpoints

```
                    ┌────────────────────────────┐
                    │          VPC               │
                    │                            │
                    │  DynamoDB Gateway Endpoint  │──→ DynamoDB (sin costo)
                    │  S3 Gateway Endpoint        │──→ S3 (sin costo)
                    │  ECR Docker Interface       │──→ ECR (gratuito dentro de AZ)
                    │  ECR API Interface          │──→ ECR API (gratuito dentro de AZ)
                    └────────────────────────────┘
```

### Seguridad (Security Groups)

```
SG_ALB:
  Inbound:  HTTP :80  ← CloudFront (prefix list)
  Outbound: ALL       → ECS tareas

SG_ECS:
  Inbound:  HTTP :80  ← SG_ALB
  Outbound: ALL       → Internet + DynamoDB + S3 + ECR

SG_VPCEndpoints:
  Inbound:  HTTPS :443 ← SG_ECS
  Outbound: N/A (AWS backbone)
```

---

## 7. Resultados

### 7.1 Infraestructura implementada

| Componente | Logro |
|---|---|
| VPC multi-AZ | 2 subnets públicas en AZ distintas, routing completo |
| ALB + CloudFront | CDN con SSL, origen protegido, health checks |
| ECS Fargate | 2 tareas con auto-scaling (CPU 60%, min 2, max 4) |
| API Gateway + Lambda | 6 rutas HTTP, 3 funciones Python, CORS habilitado |
| DynamoDB | Tabla única on-demand con 5 tipos de entidad |
| ECR | Repositorio privado con escaneo de vulnerabilidades |
| IaC | 6 módulos Terraform reutilizables, backend remoto S3 + DynamoDB locking |
| VPC Endpoints | 4 endpoints (DynamoDB, S3, ECR Docker, ECR API) |

### 7.2 Seguridad aplicada

| Práctica | Implementación |
|---|---|
| Mínimo privilegio | IAM: Lambda solo lectura/escritura en DynamoDB; ECS solo pull de ECR y envío de logs |
| Aislamiento de red | ALB solo acepta tráfico de CloudFront (prefix list); ECS solo del ALB |
| Cifrado en tránsito | CloudFront termina SSL; tráfico interno viaja por AWS backbone |
| Sin exposición pública | ALB oculto tras CloudFront; ECS sin IP pública directa |
| Escaneo de imágenes | ECR escanea vulnerabilidades al hacer push |

### 7.3 Resiliencia y escalabilidad

| Mecanismo | Detalle |
|---|---|
| Multi-AZ | Tareas distribuidas en 2 zonas de disponibilidad |
| Health checks | ALB cada 30s, reemplazo automático de tareas fallidas |
| Auto-scaling | Escala horizontal de 2 a 4 tareas al 60% de CPU |
| DynamoDB on-demand | Escala automáticamente sin aprovisionamiento |
| CloudFront | 200+ edge locations, protección DDoS incluida |

---

## 8. Conclusiones

### 8.1 Logros

- Infraestructura cloud completamente definida como código (Terraform), reproducible con un solo comando.
- Arquitectura multi-AZ con balanceo de carga, auto-scaling y health checks que garantizan alta disponibilidad.
- Costo mensual controlado (~$27 USD) mediante el uso estratégico de servicios serverless y VPC Endpoints gratuitos.
- Seguridad por capas: CloudFront + ALB + Security Groups + IAM de mínimo privilegio.
- Backend serverless (Lambda + DynamoDB) que escala a cero cuando no hay demanda.

### 8.2 Limitaciones y trabajo futuro

| Aspecto | Mejora propuesta |
|---|---|
| Sin autenticación | Integrar Amazon Cognito |
| Sin HTTPS en ALB | Agregar listener HTTPS con certificado ACM |
| Sin CI/CD | GitHub Actions para deploy automático de Terraform y frontend |
| Sin monitoreo avanzado | Dashboards CloudWatch + alarmas por costo y errores |
| Sin GSI en DynamoDB | Agregar Global Secondary Index sobre `type` |
| Sin dominio propio | Route53 + certificado ACM con dominio .cl |

### 8.3 Reflexión final

NULL_TRADE demuestra que es posible construir y desplegar una plataforma web completa en AWS utilizando exclusivamente infraestructura como código, con un presupuesto ajustado (~$27 USD/mes). La combinación de ECS Fargate para el frontend, API Gateway + Lambda para la API y DynamoDB como base de datos ofrece un equilibrio óptimo entre costo, escalabilidad y mantenibilidad. La arquitectura cumple con los principios de alta disponibilidad, seguridad por defecto y resiliencia que exige un sistema en producción, todo ello versionado y reproducible mediante Terraform.

---

**Universidad de Los Lagos · Ingeniería Civil en Informática · FDICI12 · Taller de Ingeniería Informática**
