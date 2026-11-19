import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("sync_map_styles", Path(__file__).with_name("sync-map-styles.py"))
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class MapStyleSyncTests(unittest.TestCase):
    def test_create_then_update_styles_and_associations(self):
        resources = {}
        calls = []

        def fake_request(method, path, body=None, params=None):
            calls.append((method, path, body, params))
            if method == "GET":
                key = "styleConfigs" if path.endswith("styleConfigs") else "mapConfigs" if path.endswith("mapConfigs") else "mapContextConfigs"
                return {key: [value for name, value in resources.items() if name.startswith(path + "/") and name.count("/") == path.count("/") + 1]}
            if method == "POST":
                name = f"{path}/{len(resources) + 1}"
                result = {**body, "name": name}
                if path.endswith("mapConfigs"):
                    result["mapId"] = f"map-{len(resources) + 1}"
                resources[name] = result
                return result
            if method == "PATCH":
                resources[path].update(body)
                return resources[path]
            raise AssertionError(method)

        with patch.object(module, "request", side_effect=fake_request):
            first = module.sync("test-project")
            self.assertEqual(set(first), {"web", "android", "ios"})
            self.assertEqual(len([call for call in calls if call[0] == "POST"]), 11)
            calls.clear()
            self.assertEqual(module.sync("test-project"), first)
            self.assertFalse([call for call in calls if call[0] != "GET"])
            style = next(value for value in resources.values() if value.get("displayName") == "ParknQuik dark")
            style["jsonStyleSheet"] = "[]"
            calls.clear()
            module.sync("test-project")
            self.assertEqual(len([call for call in calls if call[0] == "PATCH"]), 1)
            context = next(value for value in resources.values() if value.get("alias") == "ParknQuik dark")
            context["styleConfig"] = "projects/test-project/styleConfigs/old"
            calls.clear()
            module.sync("test-project")
            self.assertEqual(len([call for call in calls if call[0] == "PATCH"]), 1)
            self.assertEqual(context["styleConfig"], style["name"])


if __name__ == "__main__":
    unittest.main()
