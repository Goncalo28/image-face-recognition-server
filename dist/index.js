"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const bcrypt_nodejs_1 = __importDefault(require("bcrypt-nodejs"));
const cors_1 = __importDefault(require("cors"));
const knex_1 = __importDefault(require("knex"));
const clarifai_1 = __importDefault(require("clarifai"));
const CLARIFAI_API = process.env.CLARIFAI_API;
const DB_CLIENT = process.env.DB_CLIENT;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const clarifaiApi = new clarifai_1.default.App({
    apiKey: CLARIFAI_API,
});
const db = (0, knex_1.default)({
    client: DB_CLIENT,
    connection: {
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    },
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.send("welcome");
});
app.post("/signin", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json("Incorrect form submission");
    }
    db.select("email", "hash")
        .from("login")
        .where("email", "=", email)
        .then((data) => {
        const isValid = bcrypt_nodejs_1.default.compareSync(password, data[0].hash);
        if (isValid) {
            return db
                .select("*")
                .from("users")
                .where("email", "=", email)
                .then((user) => {
                res.json(user[0]);
            })
                .catch(() => res.status(400).json("unable to get user"));
        }
        else {
            res.status(400).json("wrong credentials");
        }
    })
        .catch(() => res.status(400).json("wrong credentials"));
});
app.post("/register", (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).json("Incorrect form submission");
    }
    const hash = bcrypt_nodejs_1.default.hashSync(password);
    db.transaction((trx) => {
        trx
            .insert({
            hash: hash,
            email: email,
        })
            .into("login")
            .returning("email")
            .then((loginEmail) => {
            return trx("users")
                .returning("*")
                .insert({
                email: loginEmail[0].email,
                name: name,
                joined: new Date(),
            })
                .then((user) => {
                res.json(user[0]);
            });
        })
            .then(trx.commit)
            .catch(trx.rollback);
    }).catch(() => res.status(400).json("unable to register"));
});
app.get("/profile/:id", (req, res) => {
    const { id } = req.params;
    db.select("*")
        .from("users")
        .where({ id })
        .then((user) => {
        if (user.length) {
            res.json(user[0]);
        }
        else {
            res.status(400).json("Not found");
        }
    })
        .catch(() => res.status(400).json("error getting user"));
});
app.post("/image-url", (req, res) => {
    clarifaiApi.models
        .predict(clarifai_1.default.FACE_DETECT_MODEL, req.body.input)
        .then((data) => {
        res.json(data);
    })
        .catch(() => res.status(400).json("unable to work with API"));
});
app.put("/image", (req, res) => {
    const { id } = req.body;
    db("users")
        .where("id", "=", id)
        .increment("entries", 1)
        .returning("entries")
        .then((entries) => {
        res.json(entries[0].entries);
    })
        .catch(() => res.status(400).json("unable to get entries"));
});
app.listen(8000, () => {
    console.log("app is running on port 8000");
});
