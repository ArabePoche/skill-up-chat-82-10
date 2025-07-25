// Utilitaires pour le bucket fill (remplissage)

export const getPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  };
  
  export const setPixelColor = (data: Uint8ClampedArray, x: number, y: number, width: number, color: number[]) => {
    const index = (y * width + x) * 4;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = 255;
  };
  
  export const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  };
  
  export const colorsMatch = (a: number[], b: number[]) => {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  };
  
  export const bucketFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const targetColor = getPixelColor(data, startX, startY, canvas.width);
    const fillColorRGB = hexToRgb(fillColor);
    
    if (!fillColorRGB || colorsMatch(targetColor, fillColorRGB)) return;
    
    // Algorithme de remplissage simple
    const stack = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Set<string>();
    const maxPixels = 10000; // Limiter pour éviter le freeze
    let pixelCount = 0;
    
    while (stack.length > 0 && pixelCount < maxPixels) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      visited.add(key);
      
      const currentColor = getPixelColor(data, x, y, canvas.width);
      if (!colorsMatch(currentColor, targetColor)) continue;
      
      setPixelColor(data, x, y, canvas.width, fillColorRGB);
      pixelCount++;
      
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };
  