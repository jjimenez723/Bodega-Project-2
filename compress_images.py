import os
from PIL import Image

# Source and destination directories.
SRC_DIR = "images"
DST_DIR = os.path.join(SRC_DIR, "optimized")

# Create destination directory if it does not exist.
os.makedirs(DST_DIR, exist_ok=True)

# Supported image extensions.
EXTENSIONS = (".jpg", ".jpeg", ".png", ".JPG", ".PNG")

# Compression settings.
JPEG_QUALITY = 75  # Lower = smaller file, 60-85 is typical.
PNG_OPTIMIZE = True

for filename in os.listdir(SRC_DIR):
    # Skip files that are not images we support.
    if not filename.endswith(EXTENSIONS):
        continue

    src_path = os.path.join(SRC_DIR, filename)
    dst_path = os.path.join(DST_DIR, filename)

    # Avoid recompressing files that already exist.
    if os.path.exists(dst_path):
        print(f"Skipping already optimized: {filename}")
        continue

    try:
        with Image.open(src_path) as img:
            # Save JPEGs with a target quality setting.
            if img.format == "JPEG" or filename.lower().endswith((".jpg", ".jpeg")):
                img.save(dst_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
            # Save PNGs using optimizer settings.
            elif img.format == "PNG" or filename.lower().endswith(".png"):
                img.save(dst_path, "PNG", optimize=PNG_OPTIMIZE)
            print(f"Compressed: {filename}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")

print("Batch compression complete. Optimized images are in 'images/optimized/'.")
