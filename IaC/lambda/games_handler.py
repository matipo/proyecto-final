import json, os, boto3
from boto3.dynamodb.conditions import Attr

TABLE_NAME = os.environ["TABLE_NAME"]
ddb = boto3.resource("dynamodb").Table(TABLE_NAME)


def lambda_handler(event, context):
    try:
        path = event.get("rawPath", "")

        if path == "/games":
            return list_games()
        elif path.startswith("/games/"):
            game_id = path.split("/games/")[1]
            return get_game(game_id)
        else:
            return _resp(404, {"error": "Not found"})
    except Exception as e:
        return _resp(500, {"error": str(e)})


def list_games():
    items = []
    last_key = None
    while True:
        kwargs = {"FilterExpression": Attr("type").eq("GAME")}
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        resp = ddb.scan(**kwargs)
        items.extend(resp.get("Items", []))
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break

    for item in items:
        _clean(item)

    return _resp(200, items)


def get_game(game_id):
    resp = ddb.get_item(Key={"id": game_id})
    item = resp.get("Item")
    if not item or item.get("type") != "GAME":
        return _resp(404, {"error": "Game not found"})
    _clean(item)
    return _resp(200, item)


def _clean(item):
    item.pop("type", None)
    item.pop("created_at", None)
    for key in ("price", "releaseYear"):
        if key in item:
            item[key] = int(item[key])
    if "rating" in item:
        item["rating"] = float(item["rating"])


def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
