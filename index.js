const bhttp = require('bhttp');
const cheerio = require('cheerio');
const fs = require('fs');

console.log();
console.log("YOU ARE ENTERING PRIVATE INFORMATION (YOUR BANK ACCOUNT LOGIN INFO) INTO A SCRIPT FOUND ON THE INTERNET");
console.log("USE AT OWN RISK");
console.log();

let username, password;

process.argv.forEach((val, index) => {
    if(index == 2) username = val;
    if(index == 3) password = val;
});

if(!username || !password) {
    console.log("Usage: node index <username> <password>");
    process.exit(0);
}

var session = bhttp.session();

// The username and password fields have a (seemingly) randomly generated name
// So we need to get the login page first, to retrieve those names
session.get("https://mijn.ing.nl/internetbankieren/SesamLoginServlet").then((result) => {
    const $ = cheerio.load(result.body.toString());
    const username_label = $("#gebruikersnaam label").attr("for");
    const password_label = $("#wachtwoord label").attr("for");

    // Names get, now actually log in
    let obj = {};
    obj[username_label] = username;
    obj[password_label] = password;
    return session.post("https://mijn.ing.nl/internetbankieren/SesamLoginServlet", obj);
}).then((result) => {
    // These pages are loaded by the website whenever you log in
    // There is probably some server-side logic that checks these requests
    // So just fire them off in order and ignore them
    return session.get('https://mijn.ing.nl/internetbankieren/jsp/IndexLogon.jsp')
    .then(() => 
        session.get('https://mijn.ing.nl/internetbankieren/jsp/sesam_cockpit.jsp')
    ).then(() => 
        session.get('https://mijn.ing.nl/mpb/startframes.do')
    ).then(() => 
        session.get('https://mijn.ing.nl/mpb/startpagina.do')
    ).then(() => 
        session.get('https://mijn.ing.nl/mpb/startpaginarekeninginfo.do')
    ).then(() => 
        session.get('https://bankieren.mijn.ing.nl/particulier/betalen/index')
    ).then(() =>
        // Get the actual list of products that we own
        // We use { noDecode: true } because ING prepends their JSON with non-JSON tokens
        // See `parseFunkyJson` for more information 
        session.get('https://mijn.ing.nl/mb/aggregation/api/products', { noDecode: true })
    );
}).then((result) => {
    let json = parseFunkyJson(result.body.toString());
    const transactionLinks = [];
    console.log("You have " + json.products.length + " products:");
    // Write the product list to JSON
    // This product list has a bunch of interesting links in the json.products[]._links array
    // This is a good place to look if you want to expand on this
    fs.writeFile("products.json", JSON.stringify(json.products, null, 2), () => {});
    for(const product of json.products) {
        console.log("- " + product.type + ", " + product.name + ", " + product.accountId);
        if(product.balance) {
            console.log("\t" + product.balance.value + " " + product.balance.currency);
        }
        for(const link of product._links) {
            if(link.rel === "transactions") {
                // Found a link to the transaction overview of this product
                // Add it to the list
                transactionLinks.push(session.get("https://mijn.ing.nl" + link.href, { noDecode: true }).then((result) => {
                    const transactions = parseFunkyJson(result.body.toString());
                    return {
                        product,
                        transactions
                    };
                }));
            }
        }
    }
    return Promise.all(transactionLinks);
}).then((transactions) => {
    // All transactions loaded, print and write to file
    console.log("Found " + transactions.length + " different transaction logs");
    fs.writeFile("transactions.json", JSON.stringify(transactions, null, 2), () => {});
}).catch((err) => {
    console.log("Error!");
    console.log(err);
    console.log(err.stack);
});

// the json we get back from ING starts with 5 tokens: )]}',
// presumably to break injections etc
// We just simply strip those tokens and then the responses turn into valid JSON
function parseFunkyJson(invalidJson) {
    const json = invalidJson.substring(5);
    return JSON.parse(json);
}