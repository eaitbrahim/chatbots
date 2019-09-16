const express = require('express');

const validatePhoneNumber = async (req,res,next) => {
    console.log('Validate Phone number:', req.body);
    if (typeof req.body.originalDetectIntentRequest !== 'undefined') {
        var phonenumber = req.body.originalDetectIntentRequest.payload.data.From.split(':')[1];
        console.log('phonenumber:', phonenumber);

    }
    return next();
}
module.exports = {
    validatePhoneNumber: validatePhoneNumber
}