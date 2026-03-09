"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const userRepository_1 = require("../repositories/userRepository");
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await (0, userRepository_1.createUser)(name, email, hashedPassword, role);
        res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating user" });
    }
};
exports.registerUser = registerUser;
//# sourceMappingURL=userController.js.map