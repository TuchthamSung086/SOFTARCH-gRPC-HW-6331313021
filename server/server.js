const PROTO_PATH = "./restaurant.proto";

//var grpc = require("grpc");
var grpc = require("@grpc/grpc-js");

var protoLoader = require("@grpc/proto-loader");

const mongoose = require("mongoose"); // Add Mongoose

var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    arrays: true
});

var restaurantProto = grpc.loadPackageDefinition(packageDefinition);

const { v4: uuidv4 } = require("uuid");

// Get env vars
require('dotenv').config();

// Connect to MongoDB
mongoURL = process.env.MONGO_URL;
mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Get Schema from models
const Menu = require('../models/Menu')

console.log("Connected to mongoDB!");

const server = new grpc.Server();

server.addService(restaurantProto.RestaurantService.service, {
    getAllMenu: async (_, callback) => {
        try {
            const menu = await Menu.find()
            callback(null, { menu });
        }
        catch (err) {
            console.log("Get all failed:", err);
        }
    },
    get: async (call, callback) => {
        try {
            let menuItem = Menu.findById(call.request.id)
            if (menuItem) {
                callback(null, menuItem);
            } else {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Not found"
                });
            }
        } catch (err) {
            console.log("GetById failed:", err);
        }

        //let menuItem = menu.find(n => n.id == call.request.id);

    },
    insert: async (call, callback) => {
        let menuItem = call.request;

        menuItem.id = uuidv4();

        // Create mongo Menu
        const newMenu = new Menu({
            name: call.request.name,
            price: call.request.price
        })
        // Talk to mongoDB
        try {
            await newMenu.save()
            callback(null, menuItem);
        } catch (err) {
            console.log("Insert failed:", err);
        }

    },
    update: async (call, callback) => {
        try {
            let existingMenuItem = await Menu.findById(call.request.id);
            if (existingMenuItem) {
                existingMenuItem.name = call.request.name;
                existingMenuItem.price = call.request.price;
                await existingMenuItem.save();
                callback(null, existingMenuItem);
            } else {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Not Found"
                });
            }
        } catch (err) {
            console.log("Update failed:", err);
        }
        // let existingMenuItem = menu.find(n => n.id == call.request.id);


    },
    remove: async (call, callback) => {
        try {
            let existingMenuItem = await Menu.findById(call.request.id)
            if (existingMenuItem) {
                await Menu.findOneAndDelete({ _id: call.request.id });
                callback(null, {});
            } else {
                callback({
                    code: grpc.status.NOT_FOUND,
                    details: "Not Found"
                });
            }
        } catch (err) {
            console.log("Delete failed:", err);
        }
        // let existingMenuItemIndex = menu.findIndex(n => n.id == call.request.id);
    }
});

server.bindAsync("127.0.0.1:30043", grpc.ServerCredentials.createInsecure(), () => { server.start(); });
console.log("Server running at http://127.0.0.1:30043");
