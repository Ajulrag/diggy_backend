require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('./db');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const morgan = require('morgan');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyAKCSSV8IrPPK07Q74AFWpoSMh0p0bqmLY");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// User Registration
app.post('/api/register', async (req, res) => {
    console.log("Received Register Request:", req.body); // Debugging

    const { username, password } = req.body; // Extract values

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        
        res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: 'Error creating user', details: err.message });
    }
});


app.post('/api/login', async (req, res) => {
    console.log("Received Login Request:", req.body); // Debugging

    const { login, pass } = req.body; // Extract values

    if (!login || !pass) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ username: login });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Successful login response
        res.status(200).json({ message: 'Login successful', userId: user._id });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: 'Error logging in', details: err.message });
    }
});

app.post('/api/extract', async (req, res) => { 
    console.log("rew", req.body);
    const { val } = req.body; 
console.log("val", val);
    if (!val || !val.dataToBeExtracted || !val.idData) {
        return res.status(400).json({ error: "Invalid or missing data" });
    }

    // Convert idData object into a readable string
    const idDataText = Object.entries(val.idData)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

    const prompt = `Extract ${val.dataToBeExtracted} from the following data:\n${idDataText}`;

    try {
        const result = await model.generateContent(prompt);

        // Ensure result structure is correct
        if (result?.response?.text) {
            const extractedText = result.response.text();
            console.log("Extracted Text:", extractedText);
            return res.status(201).json({ extractedData: extractedText });
        } else {
            throw new Error("Invalid response structure from model");
        }
    } catch (error) {
        console.error("Error generating content:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
