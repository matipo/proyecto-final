import json, os, uuid, boto3
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Attr

TABLE_NAME = os.environ["TABLE_NAME"]
ddb = boto3.resource("dynamodb").Table(TABLE_NAME)

SECTIONS = {
    "ACCOUNT": {
        "id": "cuentas",
        "title": "Cuentas",
        "description": "Cuentas de videojuegos disponibles para compra",
        "icon": "Gamepad",
    },
    "SKIN": {
        "id": "skins",
        "title": "Skins",
        "description": "Skins y cosméticos para intercambiar o vender",
        "icon": "Arrowright",
    },
    "TRADE": {
        "id": "tradeos",
        "title": "Tradeos",
        "description": "Intercambia tus juegos con otros usuarios",
        "icon": "Facelaugh",
    },
}


def lambda_handler(event, context):
    try:
        method = event.get("requestContext", {}).get("http", {}).get("method", "")

        if method == "GET":
            return list_community()
        elif method == "POST":
            body = json.loads(event.get("body", "{}"))
            return create_item(body)
        else:
            return _resp(405, {"error": "Method not allowed"})
    except Exception as e:
        return _resp(500, {"error": str(e)})


def list_community():
    items = []
    last_key = None
    while True:
        kwargs = {"FilterExpression": Attr("type").is_in(["ACCOUNT", "SKIN", "TRADE"])}
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        resp = ddb.scan(**kwargs)
        items.extend(resp.get("Items", []))
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break

    grouped = {"ACCOUNT": [], "SKIN": [], "TRADE": []}
    for item in items:
        t = item.get("type")
        if t in grouped:
            item.pop("type", None)
            item.pop("created_at", None)
            if "price" in item:
                item["price"] = int(item["price"])
            grouped[t].append(item)

    sections = []
    for type_key in ("ACCOUNT", "SKIN", "TRADE"):
        section = {**SECTIONS[type_key], "items": grouped[type_key]}
        sections.append(section)

    return _resp(200, sections)


def create_item(body):
    raw_type = body.get("type", "").upper()
    type_map = {"ACCOUNT": "ACCOUNT", "SKIN": "SKIN", "TRADE": "TRADE"}
    item_type = type_map.get(raw_type)
    if not item_type:
        return _resp(400, {"error": "Invalid type. Must be account, skin, or trade"})

    item = {
        "id": str(uuid.uuid4()),
        "type": item_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    for key, value in body.items():
        if key != "type":
            item[key] = value

    ddb.put_item(Item=item)
    return _resp(200, {"ok": True, "id": item["id"]})


def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
