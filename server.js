require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('./db'); // MongoDB connection
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const morgan = require('morgan');

const app = express();
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// User Registration
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send({ error: 'Username and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).send({ message: 'User registered successfully', userId: newUser._id });
    } catch (err) {
        res.status(500).send({ error: 'Error creating user', details: err });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { login, pass } = req.body;
    if (!login || !pass) {
        return res.status(400).send({ error: 'Login and password are required' });
    }
    try {
        const user = await User.findOne({ username: login });
        if (!user) return res.status(401).send({ error: 'User not found' });
        
        const match = await bcrypt.compare(pass, user.password);
        if (!match) return res.status(401).send({ error: 'Invalid password' });
        
        res.send({ message: 'Login successful', user: { login: user.username } });
    } catch (err) {
        console.log(err);
        res.status(500).send({ error: 'Database error', details: err });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
