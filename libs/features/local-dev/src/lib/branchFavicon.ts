import { useEffect } from 'react';

function branchCategory(branch: string) {
  const hash = [...branch].reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
  return (hash % 7) + 1;
}

export function useBranchFavicon(branch?: string) {
  useEffect(() => {
    if (!branch) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue(
      `--background-color-category-${branchCategory(branch)}`,
    );
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
      .forEach((icon) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d');
          if (!context) return;
          context.drawImage(image, 0, 0);
          context.globalCompositeOperation = 'screen';
          context.fillStyle = color;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.globalCompositeOperation = 'destination-in';
          context.drawImage(image, 0, 0);
          icon.href = canvas.toDataURL();
        };
        image.src = icon.href;
      });
  }, [branch]);
}
