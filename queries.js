var mysql =  require('mysql2');
var dotenv =  require('dotenv');

dotenv.config();


const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}).promise();

async function findProducts(keyword){
    const [rows] = await pool.query('SELECT * FROM productinfo WHERE keywords = ?', [keyword]);
    return rows;
}
async function findExactProduct(dataasin){
    const [rows] = await pool.query('SELECT * FROM productinfo WHERE dataasin = ?', [dataasin]);
    return rows;
}
async function addProduct(title,dataasin,price,numreview,review,keywords,href,description,features,specs){
    const [rows] = await pool.query(`INSERT INTO productinfo 
            (name,dataasin,price,numreview,review,keywords,href,descriptions,features, specs) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [title,dataasin,price,numreview,review,keywords,href,description,features,specs]);
    return rows.insertId;
}
async function getKeywords(){
    const [rows] = await pool.query('SELECT * FROM keywords');
    return rows;
}
async function findExactKeyword(key){
    const [rows] = await pool.query('SELECT * FROM keywords WHERE content = ?', [key]);
    return rows;
}
async function addKeyword(keyword){
    const [rows] = await pool.query(`INSERT INTO keywords 
            (content) 
            VALUES (?)`, 
            [keyword]);
    return rows.insertId;
}
async function removeKeyword(keyword){
    const [rows] = await pool.query(`DELETE FROM keywords WHERE content = ?`, [keyword]);
    return rows;
}
async function getMostRecent(dataasin){
    const [rows] = await pool.query('SELECT * FROM productinfo WHERE dataasin = ? ORDER BY id DESC LIMIT 1', [dataasin]);
    return rows[0];
}

async function showNonNull(keyword){
    const [rows] = await pool.query('SELECT * FROM productinfo WHERE keywords = ? GROUP BY dataasin', [keyword]);
    return rows;
}

async function addKeywordInfo(keyword, counter){
    const [rows] = await pool.query(`INSERT INTO keywordinfo
            (keyword, counter) 
            VALUES (?, ?)`, 
            [keyword, counter]);
    return rows.insertId;
}

async function findKeywordInfo(keyword){
    const [rows] = await pool.query('SELECT * FROM keywordinfo WHERE keyword = ?', [keyword]);
    return rows;
}


module.exports = {
    findProducts,
    findExactProduct,
    addProduct,
    getKeywords,
    addKeyword,
    getMostRecent,
    findExactKeyword,
    removeKeyword,
    showNonNull,
    addKeywordInfo,
    findKeywordInfo
}
