from PIL import Image
import numpy as np

img = Image.open('assets/geologia/layout-mapa-geologico-overview.png')
arr = np.array(img)
print(f"Shape: {arr.shape}")
print(f"Min: {arr.min()}, Max: {arr.max()}, Mean: {arr.mean()}")
# Check how many unique colors
colors, counts = np.unique(arr.reshape(-1, 3), axis=0, return_counts=True)
print(f"Unique colors: {len(colors)}")
top_colors = sorted(zip(counts, colors), reverse=True)[:10]
print("Top 10 colors (count, [R,G,B]):")
for cnt, col in top_colors:
    print(f"  {cnt:,} pixels: {col.tolist()}")
