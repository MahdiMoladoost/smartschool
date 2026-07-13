#!/usr/bin/env bash
set -euo pipefail

required=(
  "settings.gradle.kts"
  "build.gradle.kts"
  "app/build.gradle.kts"
  "app/src/main/AndroidManifest.xml"
  "app/src/main/java/ir/mahdimoladoost/codmacademy/MainActivity.kt"
  "app/src/main/java/ir/mahdimoladoost/codmacademy/data/ContentRepository.kt"
  "app/src/main/java/ir/mahdimoladoost/codmacademy/ui/AcademyApp.kt"
  ".github/workflows/android-release.yml"
)

for path in "${required[@]}"; do
  if [[ ! -s "$path" ]]; then
    echo "Missing or empty: $path" >&2
    exit 1
  fi
done

if rg -n '(TODO|FIXME|YOUR_API_KEY|BEGIN PRIVATE KEY)' app/src; then
  echo "Unresolved placeholder or secret-like material found." >&2
  exit 1
fi

xml_files=()
while IFS= read -r -d '' file; do
  xml_files+=("$file")
done < <(find app/src/main -name '*.xml' -print0)

python3 - "${xml_files[@]}" <<'PY'
import sys
import xml.etree.ElementTree as ET

for filename in sys.argv[1:]:
    ET.parse(filename)
print(f"Validated {len(sys.argv) - 1} XML files")
PY

echo "Project structure verified."
