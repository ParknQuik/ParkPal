#!/usr/bin/env python3
"""Create or update ParknQuik map styles and their web/mobile Map IDs."""

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://mapmanagement.googleapis.com/v2beta"


def style_sheet(theme):
    path = ROOT / "docs" / "map-styles" / f"parknquik-{theme}.json"
    data = json.loads(path.read_text())
    if not isinstance(data, list) or not data:
        raise ValueError(f"{path} must contain a non-empty Google map style array")
    return json.dumps(data, separators=(",", ":"))


def request(method, path, body=None, params=None):
    token = os.environ["GOOGLE_MAP_MANAGEMENT_TOKEN"]
    url = f"{BASE}/{path}"
    if params:
        url += "?" + urlencode(params)
    payload = json.dumps(body).encode() if body is not None else None
    req = Request(url, data=payload, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"
    })
    try:
        with urlopen(req, timeout=20) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read().decode()[:1000]
        raise RuntimeError(f"Map Management API {method} {path} failed ({error.code}): {detail}") from error


def find_named(path, collection, label, field="displayName"):
    items = request("GET", path).get(collection, [])
    matches = [item for item in items if item.get(field) == label]
    if len(matches) > 1:
        raise RuntimeError(f"Multiple Map Management resources named {label}")
    return matches[0] if matches else None


def ensure_style(project, theme):
    parent = f"projects/{project}/styleConfigs"
    label = f"ParknQuik {theme}"
    sheet = style_sheet(theme)
    current = find_named(parent, "styleConfigs", label)
    if current:
        if current.get("jsonStyleSheet") != sheet:
            request("PATCH", current["name"], {"name": current["name"], "jsonStyleSheet": sheet}, {"updateMask": "jsonStyleSheet"})
        return current["name"]
    return request("POST", parent, {"displayName": label, "jsonStyleSheet": sheet})["name"]


def ensure_map(project, platform):
    parent = f"projects/{project}/mapConfigs"
    label = f"ParknQuik {platform}"
    current = find_named(parent, "mapConfigs", label)
    if current:
        return current
    return request("POST", parent, {"displayName": label, "mapType": "VECTOR" if platform == "web" else "RASTER"})


def ensure_context(map_name, theme, style_name):
    parent = f"{map_name}/mapContextConfigs"
    alias = f"ParknQuik {theme}"
    variants = ["ROADMAP_DARK"] if theme == "dark" else ["ROADMAP"]
    current = find_named(parent, "mapContextConfigs", alias, "alias")
    body = {"mapConfig": map_name, "styleConfig": style_name, "mapVariants": variants, "alias": alias}
    if current:
        if current.get("styleConfig") != style_name or current.get("mapVariants") != variants:
            request("PATCH", current["name"], {**body, "name": current["name"]}, {"updateMask": "styleConfig,mapVariants"})
    else:
        request("POST", parent, body)


def sync(project):
    styles = {theme: ensure_style(project, theme) for theme in ("light", "dark")}
    ids = {}
    for platform in ("web", "android", "ios"):
        config = ensure_map(project, platform)
        for theme, name in styles.items():
            ensure_context(config["name"], theme, name)
        ids[platform] = config["mapId"]
    return ids


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--project")
    parser.add_argument("--validate", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    for name in ("light", "dark"):
        style_sheet(name)
    if args.validate:
        print("Map style JSON valid")
    else:
        if not args.project:
            parser.error("--project is required for sync")
        ids = sync(args.project)
        result = json.dumps(ids, indent=2)
        if args.output:
            args.output.write_text(result + "\n")
        print(result)
