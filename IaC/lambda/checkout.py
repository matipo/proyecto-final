import json, os, uuid, boto3
from datetime import datetime, timezone
from decimal import Decimal

TABLE_NAME = os.environ["TABLE_NAME"]
ddb = boto3.resource("dynamodb").Table(TABLE_NAME)

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)

def lambda_handler(event, context):
    try:
        method = event.get("httpMethod", event.get("requestContext", {}).get("http", {}).get("method", ""))
        if method == "GET":
            resp = ddb.scan(
                FilterExpression="#t = :t",
                ExpressionAttributeNames={"#t": "type"},
                ExpressionAttributeValues={":t": "ORDER"},
            )
            items = resp.get("Items", [])
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(items, cls=DecimalEncoder),
            }

        body = json.loads(event.get("body", "{}"))

        order = {
            "id": str(uuid.uuid4()),
            "type": "ORDER",
            "items": body.get("items", []),
            "total": body.get("total", 0),
            "status": "PAGADO",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        ddb.put_item(Item=order)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"ok": True, "order_id": order["id"]}),
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"ok": False, "error": str(e)}),
        }
