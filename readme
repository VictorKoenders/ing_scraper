# ING Scraper

This script will automatically download your latest transactions from https://mijn.ing.nl/

# YOU ARE ENTERING PRIVATE INFORMATION (YOUR BANK ACCOUNT LOGIN INFO) INTO A SCRIPT FOUND ON THE INTERNET
# USE AT YOUR OWN RISK

## Install
```npm install```
## Run
```node index <username> <password>```
## Output
Two files will be generated:
- products.json
This file will contain information about the products you have with ING. This is usually your pay account, credit card, etc.
- transactions.json
This will list all the transactions, per product. The structure looks like
```json
[
    {
        "product": {
            // Product information
        },
        "transactions": {
            "transactions": [
                // List of the last transactions on your account
                // For credit cards, this seems to be only the current month
                // For Payment accounts, this seems to be last ~45 transactions
            ],
            "pendingOrders": [
                // List of orders that have not finished processing
            ]
        }
    },
    // more products
]
```

## Expanding on this script
The web API that ING uses, seems to be a self-discovery service. All JSON responses have a `_links` field, with interesting links. See `products.json` and `transactions.json` for which links are retrieved.
