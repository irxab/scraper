import puppeteer from 'puppeteer';
import fs from 'fs';

// Define the dictionary for Tamimi and Panda categories
const tamimiCategory = {
  "bakery": {},
  "fruits--vegetables": {},
  "food--beverages": {},
  "deli": {},
  "frozen": {},
};

const pandaCategory = {
  "bakery": {},
  "fruits--vegetables": {},
  "beverages": {},
  "deli": {},
  "frozen": {},
};

// Category ID mappings
const tamimiCategoryIds = {
  "bakery": 1,
  "fruits--vegetables": 2,
  "food--beverages": 3,
  "deli": 4,
  "frozen": 5,
};

const pandaCategoryIds = {
  "bakery": 1,
  "fruits--vegetables": 2,
  "beverages": 3,
  "deli": 4,
  "frozen": 5,
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: null });
  const page = await browser.newPage();

  // Function to scroll down the page
  async function autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  // Scrape Tamimi
  for (let category in tamimiCategory) {
    try {
      await page.goto(`https://shop.tamimimarkets.com/category/${category}`, {
        waitUntil: 'networkidle2'
      });

      await autoScroll(page);

      await page.waitForSelector('a.Product__StyledA-sc-13egllk-1', { timeout: 30000 });

      const products = await page.evaluate((categoryId) => {
        const productElements = document.querySelectorAll('a.Product__StyledA-sc-13egllk-1');
        return Array.from(productElements).map((product, index) => {
          const nameElement = product.querySelector('.Product__StyledTitle-sc-13egllk-5');
          const priceElement = product.querySelector('.Product__PriceAndSaveButton-sc-13egllk-8 span.Text-sc-1bsd7ul-0 span');
          const imageElement = product.querySelector('img');
          const urlElement = product.getAttribute('href');

          // Extract and clean the price
          let priceText = priceElement ? priceElement.innerText.trim() : 'Price not found';
          let price = parseFloat(priceText.replace('SAR', '').trim()); // Remove "SAR" and convert to float

          // Generate a unique ID for the product
          const id = `${categoryId}${String(index + 1).padStart(4, '0')}1`;

          return {
            id: id,
            name: nameElement ? nameElement.innerText.trim() : 'Name not found',
            price: !isNaN(price) ? price : 'Price not found', // If conversion fails, return 'Price not found'
            image: imageElement ? imageElement.src : 'Image not found',
            url: urlElement ? `https://shop.tamimimarkets.com${urlElement}` : 'URL not found'
          };
        });
      }, tamimiCategoryIds[category]);

      tamimiCategory[category] = { products: products };
      console.log(`Scraped Tamimi ${category}:`, products);

    } catch (error) {
      console.error(`Error occurred while scraping Tamimi ${category}:`, error);
    }
  }

  // Scrape Panda
  for (let category in pandaCategory) {
    try {
      await page.goto(`https://panda.sa/en/category/${category}`, {
        waitUntil: 'networkidle2'
      });

      await autoScroll(page);

      // Update the selector to match the Panda website structure
      await page.waitForSelector('div.product-item', { timeout: 30000 });

      const products = await page.evaluate((categoryId) => {
        const productElements = document.querySelectorAll('div.product-item');
        return Array.from(productElements).map((product, index) => {
          const nameElement = product.querySelector('.product-title');
          const priceElement = product.querySelector('.price');
          const imageElement = product.querySelector('img');
          const urlElement = product.querySelector('a').getAttribute('href');

          // Extract and clean the price
          let priceText = priceElement ? priceElement.innerText.trim() : 'Price not found';
          let price = parseFloat(priceText.replace('SAR', '').trim()); // Remove "SAR" and convert to float

          // Generate a unique ID for the product
          const id = `${categoryId}${String(index + 1).padStart(4, '0')}2`;

          return {
            id: id,
            name: nameElement ? nameElement.innerText.trim() : 'Name not found',
            price: !isNaN(price) ? price : 'Price not found', // If conversion fails, return 'Price not found'
            image: imageElement ? imageElement.src : 'Image not found',
            url: urlElement ? `https://panda.sa${urlElement}` : 'URL not found'
          };
        });
      }, pandaCategoryIds[category]);

      pandaCategory[category] = { products: products };
      console.log(`Scraped Panda ${category}:`, products);

    } catch (error) {
      console.error(`Error occurred while scraping Panda ${category}:`, error);
    }
  }

  await browser.close();

  // Output the structured data
  const data = {
    tamimi: tamimiCategory,
    panda: pandaCategory
  };

  fs.writeFileSync('scraped_data.json', JSON.stringify(data, null, 2));
  console.log("Data saved to scraped_data.json");

})();