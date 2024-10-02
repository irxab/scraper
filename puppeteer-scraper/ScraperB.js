import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const urls = [
    'https://www.carrefourksa.com/mafsau/en/v4/search?keyword=beverages', // Beverages
    'https://www.carrefourksa.com/mafsau/en/c/FKSA1660000',            // Fruits and Vegetables
    'https://www.carrefourksa.com/mafsau/en/c/FKSA1570400',            // Still Water
    'https://www.carrefourksa.com/mafsau/en/v4/search?keyword=bakery', // Bakery
    'https://www.carrefourksa.com/mafsau/en/v4/search?keyword=Eggs#'   // Eggs
  ];

  const browser = await puppeteer.launch({ headless: true }); // Headless mode
  const page = await browser.newPage();

  const allProducts = {};

  for (const url of urls) {
    const categoryId = url.split('=')[1] || 'default'; // Use the keyword as a category identifier
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('.css-yqd9tx', { timeout: 30000 }); // Wait for the products section

      const products = await page.evaluate((categoryId) => {
        const productElements = document.querySelectorAll('.css-yqd9tx');
        return Array.from(productElements).map((product, index) => {
          const nameElement = product.querySelector('[data-testid="product_name"]');

          // Extract discount price
          const discountIntegerPart = product.querySelector('[data-testid="product-card-discount-price"] .css-14zpref')?.innerText.trim();
          const discountDecimalPart = product.querySelector('[data-testid="product-card-discount-price"] .css-1pjcwg4')?.innerText.trim();
          const discountPrice = discountIntegerPart && discountDecimalPart ? `${discountIntegerPart}.${discountDecimalPart}` : null;

          // Extract original price
          const originalIntegerPart = product.querySelector('[data-testid="product-card-original-price"] .css-14zpref')?.innerText.trim();
          const originalDecimalPart = product.querySelector('[data-testid="product-card-original-price"] .css-1pjcwg4')?.innerText.trim();
          const originalPrice = originalIntegerPart && originalDecimalPart ? `${originalIntegerPart}.${originalDecimalPart}` : null;

          // Determine final price
          const finalPrice = discountPrice ? parseFloat(discountPrice) : (originalPrice ? parseFloat(originalPrice) : null);

          // Generate a unique ID for the product
          const id = `${categoryId}${String(index + 1).padStart(4, '0')}1`;

          return {
            id: id,
            name: nameElement ? nameElement.innerText.trim() : 'Name not found',
            price: finalPrice !== null ? finalPrice : 'Price not found',
            url: product.querySelector('a')?.getAttribute('href') ? `https://www.carrefourksa.com${product.querySelector('a').getAttribute('href')}` : 'URL not found',
          };
        });
      }, categoryId);

      allProducts[categoryId] = { products: products };
      console.log(`Scraped Carrefour ${categoryId}:`, products);

    } catch (error) {
      console.error(`Error occurred while scraping Carrefour ${categoryId}:`, error);
    }
  }

  // Write the collected data to a JSON file
  fs.writeFileSync('products.json', JSON.stringify(allProducts, null, 2));
  console.log('Data saved to products.json');

  await browser.close();
})();
