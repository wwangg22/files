console.log("Hello, World!");

const cheerio = require("cheerio");
const axios = require("axios");
var fs = require("fs");
var queries = require('./queries')
const numbers = "0123456789,";
const _ = require("lodash"); 
require('dotenv').config();
const WebSocket = require('ws');


const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

// queries.getKeywords().then((result) => {
//   for (const b of result){
//     mysqlscraping(b.content);
//   }
// })

// queries.findExactProduct('B0B2D3VR4S').then((result)=>{
//   console.log(result);
// })

// runAmazon('dog leash');

//scrapeIndividual(`https://www.amazon.com/JEWOSTER-Heavy-Duty-Dog-Leash/dp/B08DCCGNZN/ref=sr_1_5?keywords=dog%2Bleash&qid=1695737271&sr=8-5&th=1`,'');
//That's it, the rest is puppeteer usage as normal 😊
async function getCookies(){
  var cookies;
  await puppeteer.launch({ headless: process.env.NODE_ENV === 'prod'}).then(async browser => {
    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600 })
  
    console.log(`Testing adblocker plugin..`)
    await page.goto('https://www.amazon.com')
    await page.waitForTimeout(10000)
    cookies = _.join(
                        _.map(
                          await page.cookies(),
                          ({ name, value }) => _.join([name, value], '='),
                        ),
                        '; ',
                      )
    console.log(`All done, check the screenshots. ✨`)
    await browser.close()
  })
  return cookies;
}


async function scrapeIndividual(href,cookies) {
  const axiosResponse = await axios.request({
    method: "GET",
    url: href,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.36",
      Cookie:
        cookies,
    },
  });
  const $ = cheerio.load(axiosResponse.data);
  const featurebullets = $("#feature-bullets");
  const features = featurebullets.text();
  console.log(features);
  fs.writeFile("test.txt", axiosResponse.data, function (err) {console.log('err')})
  // console.log(features);
  // //console.log('features',features)
  // // const itemdescription = $("#productDescription");
  // // const descrip = itemdescription.text();
  // //console.log('descrip',descrip)
  console.log("scraped ");
  return features, '';
}

async function test(key, cookies, wss, dic, count){

  const objcookies = cookies.split('; ').map(res => res.split(/=(.*)/s).slice(0,2)).map(([name, value]) => ({ name: name, value:value, domain: '.amazon.com', sourceScheme: 'Secure',  sourcePort: 443, httpOnly: false}));
  console.log(objcookies);
  var keywordcounter = {};

  // const urls = ['a','b','c']
  // var a = 1;
  // for (const url of urls){
  //   setTimeout(()=>{
  //     dic[count] = (a) / urls.length;
  //     console.log(dic);
  //     wss.clients.forEach(function each(client) {
  //                       if (client.readyState === WebSocket.OPEN){
  //                           client.send(JSON.stringify(dic));
  //                       }
  //                   })
  //     a+=1;
  //   },Math.random()*10000)
  // }

  await puppeteer.launch({ headless: process.env.NODE_ENV === 'prod' }).then(async browser => {
    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600 })
  
    console.log(`Testing adblocker plugin..`)
    await page.setCookie(...objcookies);
    await page.goto('https://www.amazon.com')
    const cc = await page.cookies();
    console.log(cc);
    await page.waitForTimeout(523)
    try{
      await page.waitForSelector('#twotabsearchtextbox');
    }
    catch(e){
      console.log(e);
      const cookies = _.join(
                        _.map(
                          await page.cookies(),
                          ({ name, value }) => _.join([name, value], '='),
                        ),
                        '; ',
                      )
      
      
              
    }
    await page.type('#twotabsearchtextbox', key)
    await page.waitForTimeout(1040);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'load' });
    await page.waitForSelector('a[class="a-link-normal s-no-outline"]');
    const links = await page.$$('a[class="a-link-normal s-no-outline"]');
    
    // Collect all href attributes of the links.
    const urls = await Promise.all(links.map(link => page.evaluate(el => el.href, link)));
    
    // Loop through each URL and navigate to it.
    var a =1;
    for (const url of urls) {
      // Navigate to the URL.
      try{
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForTimeout(300);
      
        // Perform your actions on the new page.
        try{
          await page.waitForSelector('#prodDetails');
        }
        catch(e){
          await page.reload();
          await page.waitForSelector('#prodDetails');

        }
        const content = await page.content();
        analyzePage(content,key.split(' ').join(''),page.url(),keywordcounter);
      
        // Add a delay if necessary.
      }
      catch(e){
        continue
      }
      dic[count] = ((a)/urls.length);
      wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN){
                        client.send(JSON.stringify(dic));
                    }
                })
      a+=1;
      
    }
    console.log(keywordcounter);
    queries.addKeywordInfo(key, JSON.stringify(keywordcounter));
    

    // await page.waitForTimeout(5000);
    // const j = await page.content();
    // const $ = cheerio.load(j);
    // const divs = $(".s-main-slot.s-result-list.s-search-results.sg-row");
    // console.log(divs);
    // var dataasin = [];
    // divs.children("div").each((index, element) => {
    //   if ($(element).attr("data-asin")){
    //     console.log($(element).attr("data-asin"));
    //     dataasin.push($(element).attr("data-asin"));
    //   }
    // })
    await browser.close()
  })
}
async function analyzePage(data, sqlkey, href,keywordcounter){
  const $ = cheerio.load(data);
  const name = $('#productTitle').text();
  const reviewsection = $('#averageCustomerReviews');
  const review = isNaN(parseFloat($(reviewsection).find('.a-size-base.a-color-base').text())) ? 0 : parseFloat($(reviewsection).find('.a-size-base.a-color-base').text());
  const numreview = isNaN(parseInt($(reviewsection).find('#acrCustomerReviewText').text().split(' ')[0].split(',').join(''))) ? 0 : parseInt($(reviewsection).find('#acrCustomerReviewText').text().split(' ')[0].split(',').join(''))
  const price = isNaN(
    parseFloat($(".a-price-whole").first().text()) +
    parseFloat("0." + $(".a-price-fraction").first().text())
  ) ? 0 : parseFloat($(".a-price-whole").first().text()) +parseFloat("0." + $(".a-price-fraction").first().text());
  var features;
  for (const z of $('#feature-bullets').find('li'))
  {
    features += $(z).text() + '\n';
    console.log(features);
  }
  for (const z of features.replace(/[\W_]+/g, ' ').split(' ')){
    if (z.toLowerCase() in keywordcounter){
      keywordcounter[z.toLowerCase()] += 1;
    }
    else{
      keywordcounter[z.toLowerCase()] = 1;
    }
  }

  const productdetails = $('#productDetails_techSpec_section_1').find('tbody');
  const pd = {};
  productdetails.find('tr').each((index,element)=>{
    const ky = $(element).find('th').text().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, "");
    const val = $(element).find('td').text().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, "");
    // console.log('key', ky);
    // console.log('value',val);
    pd[ky] = val;
  })
  const specs = JSON.stringify(pd);
  console.log(specs);
  // const randomData = {}
  // productdetails.children('li').each((index,element)=>{
  //   console.log(index);
  //   const key = $(`#detailBullets_feature_div ul:nth-child(1) li:nth-child(${index+1}) span:nth-child(1) span:nth-child(1)`).text().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, " ").split(' ').join('');
  //   console.log(key);
  //   console.log(JSON.stringify(key));
  //   const value = $(`#detailBullets_feature_div ul:nth-child(1) li:nth-child(${index+1}) span:nth-child(1) span:nth-child(2)`).text().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, " ").split(' ').join('');
  //   console.log(value);
  //   console.log(JSON.stringify(value));

  //   randomData[key] = value;
  // }
  // )
  //const proddetails = $('#prodDetails').text().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, " ");
  //console.log(proddetails);
  const dataasin = href.split('/')[5];
  //const dataasin = randomData['ASIN'];
  const desc='';

  const exact = queries.getMostRecent(dataasin).then((result) => {
    if (result){
      if (isdifferent(result, name, price, numreview, review, sqlkey, desc, features, specs)){
        queries.addProduct(name, dataasin, price, numreview, review, sqlkey, href, desc, features, specs);
        console.log('product changed!')
      }
    }
    else{
      queries.addProduct(name, dataasin, price, numreview, review, sqlkey, href, desc, features,  specs);
      console.log('added new product!')
    }
  });
  console.log($('productDetails_techSpec_section_1').text().replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, " "));
  console.log(dataasin);
}
async function runAmazon(key){
  //cookie made myself
  const newKeywords = key.split(" ").join("+");
  const sqlkey = key.split(" ").join("");
  console.log(key);


  const axiosResponse = await axios.request({
    method: "GET",
    url: `https://amazon.com/s?k=${newKeywords}`,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 Edg/116.0.1938.69",
      Cookie:
        "i18n-prefs=USD; skin=noskin; ubid-main=130-8468536-4259523; session-id=132-8468616-5962418; session-id-time=2082787201l; JSESSIONID=6EC09A3F50FE276C57268A9050D9FE7D; session-token=nctNboqzbAIwt3gCYbGdC/VUPk06Jq6rvCwMdAgSEwuEnl3Jp6sxruR9pZl00y1XPUHjxKsgXxxU1BMIp5rfu1TnUzbevfpc/2yhMBc73j7CdBHJkBKbDJUqm03ivyABCeKZmmXzCkiJHYJjpSTnSR+1i6sM+yXHAFvV4UcfBpFCPf7xte3o/db14gp24ffQoY71BozfLptZbuo055GZ0tPm7oftHTQ7Licq096i7KSO8V1ES5dwLvSF6ndUlWl3Hz7Jg91++0S1OO1Y7F46gvMW1LM0UhMfwHrdjEvXKrDeFHQ9SLtUW61HA6HgzyPe1I6ohmzDZ0mR3PqE6Gur0V10cBqAfmj8; csm-hit=tb:FBN99H9RYFC87YH7DGG6+s-7E27EKKCM189CNGTC36Y|1694097955043&t:1694097955043&adb:adblk_no",
    },
  });
  const $ = cheerio.load(axiosResponse.data);
  const divs = $(".s-main-slot.s-result-list.s-search-results.sg-row");
  //console.log(divs);
  getCookies().then((cookies) => {
    divs.children("div").each((index, element) => {
      if ($(element).attr("data-asin")) {
        const dataasin = $(element).attr("data-asin");
        const name = $(element)
          .find(".a-size-base-plus.a-color-base.a-text-normal")
          .text();

        //getting sales from last month
        var num;
        const numbersbought = $(element).find(".a-size-base.a-color-secondary");
        numbersbought.each((index, b) => {
          string_value = $(b).text();
          if (string_value[0] in numbers.split("")) {
            var j = 0;
            while (string_value[j] in numbers.split("")) {
              j++;
            }
            num = parseInt(string_value.slice(0, j));
            if (string_value[j] == "K") {
              num *= 1000;
            }
          }
        });
        //getting reviews
        var review;
        var numreview;
        const reviews = $(element).find(".a-row.a-size-small").children("span");
        if ($(reviews[0]).attr("aria-label")) {
          review = parseFloat($(reviews[0]).attr("aria-label").slice(0, 3));
        }
        if ($(reviews[1]).attr("aria-label")) {
          numreview = parseInt($(reviews[1]).attr("aria-label").replace(",", ""));
        }
        //getting link to product
        const href =
          "https://amazon.com" +
          $(element).find(".a-link-normal.s-no-outline").attr("href");
        //getting price
        const price =
        isNaN(
          parseFloat($(element).find(".a-price-whole").text()) +
          parseFloat("0." + $(element).find(".a-price-fraction").text())
        ) ? 0 : parseFloat($(element).find(".a-price-whole").text()) +parseFloat("0." + $(element).find(".a-price-fraction").text());
        var prime = false;
        if ($(element).find(".a-icon.a-icon-prime.a-icon-medium").length) {
          prime = true;
        }
        scrapeIndividual(href,cookies).then((features,desc) => {
          //console.log(features,desc);
          const exact = queries.getMostRecent(dataasin).then((result) => {
            console.log(features,desc)
            if (result){
              if (isdifferent(result, name, price, numreview, review, sqlkey, desc, features, specs)){
                queries.addProduct(name, dataasin, price, numreview, review, sqlkey, href, desc, features, specs);
                console.log('product changed!')
              }
            }
            else{
              queries.addProduct(name, dataasin, price, numreview, review, sqlkey, href, desc, features, specs);
              console.log('added new product!')
            }
          });

        })

      }
    });
  });
  console.log("done");
}

async function processCheerio(data){
  const $ = cheerio.load(data);
  const divs = $(".s-main-slot.s-result-list.s-search-results.sg-row");
  //console.log(divs);
  divs.children("div").each((index, element) => {
    if ($(element).attr("data-asin")) {
      const dataasin = $(element).attr("data-asin");
      const name = $(element)
        .find(".a-size-base-plus.a-color-base.a-text-normal")
        .text();

      //getting sales from last month
      var num;
      const numbersbought = $(element).find(".a-size-base.a-color-secondary");
      numbersbought.each((index, b) => {
        string_value = $(b).text();
        if (string_value[0] in numbers.split("")) {
          var j = 0;
          while (string_value[j] in numbers.split("")) {
            j++;
          }
          num = parseInt(string_value.slice(0, j));
          if (string_value[j] == "K") {
            num *= 1000;
          }
        }
      });
      //getting reviews
      var review;
      var numreview;
      const reviews = $(element).find(".a-row.a-size-small").children("span");
      if ($(reviews[0]).attr("aria-label")) {
        review = parseFloat($(reviews[0]).attr("aria-label").slice(0, 3));
      }
      if ($(reviews[1]).attr("aria-label")) {
        numreview = parseInt($(reviews[1]).attr("aria-label").replace(",", ""));
      }
      //getting link to product
      const href =
        "https://amazon.com" +
        $(element).find(".a-link-normal.s-no-outline").attr("href");
      //getting price
      const price =
      isNaN(
        parseFloat($(element).find(".a-price-whole").text()) +
        parseFloat("0." + $(element).find(".a-price-fraction").text())
      ) ? 0 : parseFloat($(element).find(".a-price-whole").text()) +parseFloat("0." + $(element).find(".a-price-fraction").text());
      var prime = false;
      if ($(element).find(".a-icon.a-icon-prime.a-icon-medium").length) {
        prime = true;
      }
      scrapeIndividual(href,cookies).then((features,desc) => {
        //console.log(features,desc);
        const exact = queries.getMostRecent(dataasin).then((result) => {
          console.log(features,desc)
          if (result){
            if (isdifferent(result, name, price, numreview, review, sqlkey, desc, features)){
              queries.addProduct(name, dataasin, price, numreview, review, sqlkey, href, desc, features);
              console.log('product changed!')
            }
          }
          else{
            queries.addProduct(name, dataasin, price, numreview, review, sqlkey, href, desc, features);
            console.log('added new product!')
          }
        });

      })

    }
  });
}

async function testing(dic){
  const p1 = await new Promise((res) => setTimeout(()=>{dic[Math.random()] = Math.random(); res('hey');}, 500));
  return;
}
function isdifferent(data1,name, price, numreview, review, keywords, descrip,features,specs){
  console.log('name', data1.name==name);
  console.log('price', data1.price==price);
  console.log('numreview', data1.numreview==numreview);
  console.log('review', data1.review==review);
  console.log('keywords', data1.keywords==keywords);
  console.log('descriptions', data1.descriptions==descrip);
  console.log('features', data1.features==features);
  console.log('specs', JSON.stringify(data1.specs)==specs);
  if (data1.name == name && 
      data1.price == price && 
      data1.numreview == numreview && 
      data1.review == review && 
      data1.keywords == keywords &&
      data1.descriptions == descrip &&
      data1.features == features //&&
      //data1.specs == specs
      ){

    return false;
  }
  else
  {
    return true;
  }
}
module.exports = {
  runAmazon,
  test,
  testing
  
}