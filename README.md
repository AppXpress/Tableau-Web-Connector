# AppXpress Tableau Web Connector

This repository is essentially Tableau's open sourced [web data connector simulator](https://github.com/tableau/webdataconnector) with a GT Nexus Web Data Connector added into it. The GT Nexus Web Data Connector leverages AppXpress technology to fetch data relating to the Trading Partner Management application.

## Setup

1. Clone this repository
2. Run `npm install` within the cloned directory. This will download all of the packages dependencies, as defined in the **package.json** file. You should see a node_modules folder appear in your folder
3. Run `npm start`. This will do two things - start a simple node.js file server, ( using the http-server npm packge ) that will server the simulator static files to your browser and it will start a proxy server which is used to send requests against the GT Nexus platform over HTTPS
4. Open up your browser and navigate to **localhost:8888/Simulator**. The connector url at the top of the page should default to the AppXpress Web connector - using the URL *../GTN_Connector/gtnexus_connect.html*. Also included in the repository are examples taken from Tableau Web Connector open source project.

If you are using the Tableau Desktop - use the URL **locahost:8888/GTN_Connector/gtnexus_connect.html** to connect to the AppXpress connector.
