const express = require('express')
const app = express()
const server = require('http').createServer(app);
const cheerio = require("cheerio");
const axios = require("axios");
var fs = require("fs");
var queries = require('./queries.js');
var amazon = require('./amazonscraper.js')
var cookieParser = require('cookie-parser')
var cors = require('cors');
const WebSocket = require('ws');
var progress = {};

const corsOptions = {
    origin: true,
    credentials: true
  }

const wss = new WebSocket.Server({ server: server});

wss.on('connection', function connection(ws) {
    console.log('new connection!');
    ws.send('Welcome new Client!')
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        ws.send(JSON.stringify(progress));
    });
});

app.options('*', cors(corsOptions)); // preflight OPTIONS; put before other routes

app.use(express.json())

app.use((req, res, next) => {
    console.log("req received from client");
    console.log(req.method);
    console.log(req.body);
    console.log(req.originalUrl);
    if (req.method == 'GET')
    {
        const request = req.originalUrl.slice(1);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (Object.keys(req.query).length){
            console.log('query')
            const dic = req.query;
            console.log(dic)
            if (dic.keywords){
            queries.findExactKeyword(dic.keywords).then((result) => {
                    if (result.length > 0){
                        if (dic.remove === 'true'){
                            queries.removeKeyword(dic.keywords).then((result) => {console.log('successfully deleted keyword');});
                        }
                    }
                    else{
                        if (dic.remove != 'true'){
                            queries.addKeyword(dic.keywords).then((result) => {console.log('successfully added keyword');});
                        }
                    }
            })
                
            }
        
            if (dic.amazon === 'true'){
                console.log('go fuck yourself');
                queries.getKeywords().then((result)=>{
                    runAma(result);
                    res.send(JSON.stringify({'response': 'success'}));
                });
            }
            if (dic.search){
                console.log('returning search!');
                console.log(dic.search);
                queries.findExactProduct(dic.search).then((result)=>{
                    if (result.length > 0){
                        console.log(result[0]['created']);
                        console.log(new Date(result[0]['created']).toLocaleString())
                        res.send(JSON.stringify(result));
                        console.log('sent');
                    }
                })
            }
        }
        else{
            if (request =="keywords"){
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            console.log('keyword files requested!');
            var keywords = {'keywords':[]}
            queries.getKeywords().then((result)=>{
                for (const b in result){
                    keywords['keywords'].push(result[b].content);
                }
                res.send(JSON.stringify(keywords));
            });
            }
            else{
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                console.log(`${request} files requested!`);
                queries.showNonNull(request).then((result)=>{
                    //console.log(result);
                    res.send(JSON.stringify(result));
                })
                }
        }
    }
    else{
        next();
    }
});          
app.post('*', (req, res) => {
    console.log('post request received!');
    //console.log(req.body.Cookie);
    const cookies = req.body.Cookie;
    console.log('go fuck yourself');
    queries.getKeywords().then((result)=>{
        var count = 0;
        for (const b in result){
            progress[count] = 0;
            // amazon.testing(dic).then(()=>{
            //     console.log('done');
            //     console.log(dic);
            // })
            //amazon.runAmazon(result[b].content)
            amazon.test(result[b].content,cookies,wss,progress,count).then(()=>{
                
            });
            count += 1
        }
        console.log(progress);
    });
    res.send(JSON.stringify({'response': 'success'}));
})
server.listen(3000, () => console.log('Node.js app listening on port 3000.'))


async function runAma(keywords){

    await keywords.reduce(async (promise, keyword) => {
        // This line will wait for the last async function to finish.
        // The first iteration uses an already resolved Promise
        // so, it will immediately continue.
        await promise;
        const j = amazon.test(keyword.content);
        console.log('finished with one!');
      }, Promise.resolve());
}