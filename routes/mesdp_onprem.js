const _ = require('lodash');
const {
    stripIndent
} = require('common-tags');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const keys = require('../config/keys');
const ManageEngineLog = require('../services/manageEngineLogs');
const authClientRequest = require('../middlewares/authGuard');

module.exports = app => {
    app.post('/api/me_requests', authClientRequest.authClientToken, async (req, res) => {
        console.log('Received body:', req.body);
        var result = {};
        if (typeof req.body.originalDetectIntentRequest !== 'undefined') {
            result = await processWhatsappData(req.body);
        } else {
            result = await processTicketChanges(req.body);
        }
        res.json(result);
    });

    app.get('/api/me_requests', authClientRequest.authClientToken, async (req, res) => {
        res.json({
            'Message': 'Hello!'
        });
    });

    app.get('/api/me_generateJwt', async (req, res) => {
        let token = jwt.sign({
            id: keys.twilioSidForApi
        }, keys.secret, {
            expiresIn: 2592000
        });
        console.log('Token:', token);
        res.status(200).json({
            "success": [{
                "msg": "Token generated successfully",
                "token": token
            }]
        })
    });
};