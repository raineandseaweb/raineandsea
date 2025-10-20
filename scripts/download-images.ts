import { config } from "dotenv";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";

// Load environment variables
config({ path: ".env.local" });

interface Product {
  _id: string;
  title: string;
  imgUrl: string;
  images?: Array<{
    thumbnail: string;
    original: string;
  }>;
  variants?: Array<{
    options?: Array<{
      imgUrl?: string;
    }>;
  }>;
}

async function downloadImage(url: string, filename: string): Promise<boolean> {
  try {
    console.log(`Downloading: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `Failed to download ${url}: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const buffer = await response.buffer();
    fs.writeFileSync(filename, buffer);
    console.log(`✓ Downloaded: ${filename}`);
    return true;
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return false;
  }
}

async function downloadAllImages() {
  try {
    // Read products.json
    const productsData = fs.readFileSync("products.json", "utf-8");
    const products: Product[] = JSON.parse(productsData);

    // Create images directory
    const imagesDir = path.join(process.cwd(), "public", "images", "products");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    let downloadedCount = 0;
    let failedCount = 0;
    const downloadedImages: Record<string, string> = {};

    console.log(`Found ${products.length} products to process...`);

    for (const product of products) {
      const productId = product._id;
      const productTitle = product.title
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

      // Download main product image
      if (product.imgUrl) {
        const extension = path.extname(product.imgUrl) || ".jpg";
        const filename = `${productId}-${productTitle}${extension}`;
        const filepath = path.join(imagesDir, filename);

        const success = await downloadImage(product.imgUrl, filepath);
        if (success) {
          downloadedImages[product.imgUrl] = `/images/products/${filename}`;
          downloadedCount++;
        } else {
          failedCount++;
        }
      }

      // Download additional product images (thumbnails and originals)
      if (product.images) {
        for (let i = 0; i < product.images.length; i++) {
          const image = product.images[i];

          // Download thumbnail
          if (image.thumbnail) {
            const extension = path.extname(image.thumbnail) || ".jpg";
            const filename = `${productId}-${productTitle}-thumb-${i}${extension}`;
            const filepath = path.join(imagesDir, filename);

            const success = await downloadImage(image.thumbnail, filepath);
            if (success) {
              downloadedImages[
                image.thumbnail
              ] = `/images/products/${filename}`;
              downloadedCount++;
            } else {
              failedCount++;
            }
          }

          // Download original
          if (image.original) {
            const extension = path.extname(image.original) || ".jpg";
            const filename = `${productId}-${productTitle}-orig-${i}${extension}`;
            const filepath = path.join(imagesDir, filename);

            const success = await downloadImage(image.original, filepath);
            if (success) {
              downloadedImages[image.original] = `/images/products/${filename}`;
              downloadedCount++;
            } else {
              failedCount++;
            }
          }
        }
      }

      // Download variant images
      if (product.variants) {
        for (const variant of product.variants) {
          if (variant.options) {
            for (const option of variant.options) {
              if (option.imgUrl) {
                const extension = path.extname(option.imgUrl) || ".jpg";
                const filename = `${productId}-variant-${
                  option._id || Math.random().toString(36).substr(2, 9)
                }${extension}`;
                const filepath = path.join(imagesDir, filename);

                const success = await downloadImage(option.imgUrl, filepath);
                if (success) {
                  downloadedImages[
                    option.imgUrl
                  ] = `/images/products/${filename}`;
                  downloadedCount++;
                } else {
                  failedCount++;
                }
              }
            }
          }
        }
      }

      // Add delay to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Save mapping of original URLs to local paths
    fs.writeFileSync(
      path.join(process.cwd(), "public", "images", "image-mapping.json"),
      JSON.stringify(downloadedImages, null, 2)
    );

    console.log(`\n🎉 Download complete!`);
    console.log(`✓ Successfully downloaded: ${downloadedCount} images`);
    console.log(`✗ Failed downloads: ${failedCount} images`);
    console.log(`📁 Images saved to: ${imagesDir}`);
    console.log(`📄 Image mapping saved to: public/images/image-mapping.json`);
  } catch (error) {
    console.error("Error downloading images:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  downloadAllImages()
    .then(() => {
      console.log("Image download process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Image download process failed:", error);
      process.exit(1);
    });
}

export { downloadAllImages };
