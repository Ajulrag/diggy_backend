const express = require('express');
const db = require('./db');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Route to register a new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({ error: 'Username and password are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        (err, result) => {
            if (err) {
                return res.status(500).send({ error: 'Error creating user', details: err });
            }
            res.status(201).send({ message: `User created with ID: ${result.insertId}` });
        }
    );
});

// Route to login a user
app.post('/api/login', (req, res) => {
    const { login, pass } = req.body;

    if (!login || !pass) {
        return res.status(400).send({ error: 'Login and password are required' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [login], async (err, results) => {
        if (err) {
            return res.status(500).send({ error: 'Database error', details: err });
        }
        if (results.length === 0) {
            return res.status(401).send({ error: 'User not found' });
        }

        const user = results[0];

        // Compare the hashed password
        const match = await bcrypt.compare(pass, user.password);
        if (match) {
            // Fetch groups associated with the user
            db.query(
                'SELECT g.id, g.title, g.url FROM `groups` g WHERE g.user_id = ?',
                [user.id],
                (err, groupResults) => {
                    if (err) {
                        return res.status(500).send({ error: 'Error fetching user groups', details: err });
                    }

                    // Send response with groups data
                    res.send({
                        message: 'Login successful',
                        user: { login: user.username },
                        groups: groupResults // Include the groups associated with the user
                    });
                }
            );
        } else {
            res.status(401).send({ error: 'Invalid password' });
        }
    });
});



app.post('/api/addgroup', (req, res) => {
    const { title, url } = req.body;
    console.log(req.body, "==========");

    const login = 'ajulrag@teknikforce.com';
    const pass = 'test';

    if (!login || !pass || !title) {
        return res.status(400).send({ error: 'Login, password, and title are required' });
    }

    db.query('SELECT * FROM users WHERE username = ?', [login], async (err, results) => {
        if (err) {
            return res.status(500).send({ error: 'Database error', details: err });
        }
        if (results.length === 0) {
            return res.status(401).send({ error: 'User not found' });
        }

        const user = results[0];

        const match = await bcrypt.compare(pass, user.password);
        if (!match) {
            return res.status(401).send({ error: 'Invalid password' });
        }

        db.query(
            'INSERT INTO `groups` (user_id, title, url) VALUES (?, ?, ?)',
            [user.id, title, url],
            (err, result) => {
                if (err) {
                    return res.status(500).send({ error: 'Error adding group', details: err });
                }

                // Fetch the newly created group details
                const groupId = result.insertId;

                db.query(
                    'SELECT id, title, url FROM `groups` WHERE id = ?',
                    [groupId],
                    (err, groupResults) => {
                        if (err) {
                            return res.status(500).send({ error: 'Error fetching group details', details: err });
                        }

                        const newGroup = groupResults[0];
                        res.status(200).send({
                            message: 'Group added successfully',
                            groupId: newGroup.id,
                            title: newGroup.title,
                            url: newGroup.url
                        });
                    }
                );
            }
        );
    });
});


// Route to edit a group
app.post('/api/editgroup', (req, res) => {
    const { groupId, login, pass, title, url } = req.body;

    // First, check if the user exists
    db.query('SELECT * FROM users WHERE username = ?', [login], (err, userResult) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ error: 'Error fetching user' });
        }

        if (userResult.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }
  
        const user = userResult[0];
        
        // Check if the password matches
        bcrypt.compare(pass, user.password, (err, match) => {
            if (err) {
                console.error('Error comparing password:', err);
                return res.status(500).json({ error: 'Error comparing password' });
            }

            if (!match) {
                return res.status(400).json({ error: 'Invalid password' });
            }

            // Now update the group
            const sql = 'UPDATE `groups` SET title = ?, url = ? WHERE id = ? AND user_id = ?';
            db.query(sql, [title, url, groupId, user.id], (err, result) => {
                if (err) {
                    console.error('Error updating group:', err);
                    return res.status(500).json({
                        error: 'Error updating group',
                        details: err.message || err,
                    });
                }

                // Check if any rows were affected (i.e., if the group exists and the user is authorized)
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Group not found or not authorized' });
                }

                res.json({ message: 'Group updated successfully' });
            });
        });
    });
});


// Route to delete a group
app.post('/api/delgroup', (req, res) => {
    const { groupId, login, pass } = req.body;

    // Step 1: Verify user credentials
    db.query('SELECT * FROM users WHERE username = ?', [login], async (err, results) => {
        if (err) {
            return res.status(500).send({ error: 'Database error', details: err });
        }
        if (results.length === 0) {
            return res.status(401).send({ error: 'User not found' });
        }

        const user = results[0];

        // Step 2: Check password
        const match = await bcrypt.compare(pass, user.password);
        if (!match) {
            return res.status(401).send({ error: 'Invalid password' });
        }

        // Step 3: Delete the group
        db.query(
            'DELETE FROM `groups` WHERE id = ? AND user_id = ?',
            [groupId, user.id],
            (err, result) => {
                if (err) {
                    return res.status(500).send({ error: 'Error deleting group', details: err });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).send({ error: 'Group not found or not authorized' });
                }

                res.status(200).send({ message: 'Group deleted successfully' });
            }
        );
    });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
