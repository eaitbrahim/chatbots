const _ = require('lodash');
const { stripIndent } = require('common-tags');
const axios = require('axios');
const GoogleSheet = require('../services/GoogleSheet');
const keys = require('../config/keys');

module.exports = app => {
  app.post('/api/ticket', async (req, res) => {
    if (typeof req.body.originalDetectIntentRequest !== 'undefined') {
      var result;
      var phonenumber = req.body.originalDetectIntentRequest.payload.data.From.split(
        ':'
      )[1];

      if (req.body.queryResult.intent.displayName === 'CreateNewTicket') {
        var firstName =
          req.body.queryResult.outputContexts[0].parameters['given-name'];
        var lastName =
          req.body.queryResult.outputContexts[0].parameters['last-name'];
        var subject =
          req.body.queryResult.outputContexts[0].parameters['ticket-subject'];
        var description =
          req.body.queryResult.outputContexts[0].parameters[
            'ticket-description'
          ];

        result = await createTicket(
          phonenumber,
          firstName,
          lastName,
          subject,
          description
        );
      }

      if (req.body.queryResult.intent.displayName === 'Check Status') {
        var ticketNumber = req.body.queryResult.parameters['number'];
        result = await consultTicket(ticketNumber, phonenumber);
      }

      res.json(result);
    } else {
      try {
        const { Number, Full_name, Phone_Number, Subject, Status } = req.body;
        const message = stripIndent`
                                                    *Numéro de ticket: ${Number}*.
                                                  👤Crée par: ${Full_name}.
                                                  🛠 Sujet de ticket: ${Subject}.
                                                  🔖 Statut actuel: ${Status}.
                                                    `;
        const twilioClient = require('twilio')(
          keys.twilioAccountSid,
          keys.twilioAuthToken
        );
        console.log(`whatsapp:+${Phone_Number}`);
        twilioClient.messages
          .create({
            from: 'whatsapp:+14155238886',
            body: message,
            to: `whatsapp:+${Phone_Number}`
          })
          .then(message => console.log(message.sid));
      } catch (err) {
        console.log('err:', err);
      }
    }
  });
};

async function createTicket(
  phonenumber,
  firstName,
  lastName,
  subject,
  description
) {
  try {
    const googleSheet = new GoogleSheet(keys.ticketSheetId);
    var response = { fulfillmentText: '' };
    var ticket = {
      number: Date.now(),
      fullname: `${firstName} ${lastName}`,
      phonenumber,
      subject,
      description,
      status: 'Open',
      date: new Date().toString()
    };

    await googleSheet.submitTicket(ticket);
    response.fulfillmentText = formatResponse([
      stripIndent`
                                        🛠 Votre ticket a été créé avec succès. 
                                        *Votre numéro de ticket est ${
                                          ticket.number
                                        }*
                                        `
    ]);

    return response;
  } catch (err) {
    console.log('Error: ', err);
  }
}

function formatResponse(stripedIndented) {
  var formatedResponse = '';
  stripedIndented.push(
    "Que puis-je faire pour vous: créer un nouveau ticket ou bien consulter le statut d'un ticket existant?"
  );
  formatedResponse = _.join(stripedIndented, '\n---\n');
  console.log(formatedResponse);
  return formatedResponse;
}

async function consultTicket(ticketNumber, phonenumber) {
  try {
    const googleSheet = new GoogleSheet(keys.ticketSheetId);
    var response = { fulfillmentText: ' ', fulfillmentMessages: [] };
    if (ticketNumber != 'undefined' && ticketNumber != '') {
      var { subject, fullname, status } = await googleSheet.getTicketStatus(
        ticketNumber
      );
      response.fulfillmentText = [
        stripIndent`
                                      *Numéro de ticket: ${ticketNumber}*.
                                     👤Crée par: ${fullname}.
                                     🛠 Sujet de ticket: ${subject}. 
                                     🔖 Actuel Statut: ${status}. 
                                      `,
        "Que puis-je faire pour vous: créer un nouveau ticket ou bien consulter le statut d'un ticket existant?"
      ].join('\n---\n');
    } else {
      var tickets = await googleSheet.getTicketStatusByPhonenumber(phonenumber);
      response.fulfillmentMessages = tickets;
    }
    return response;
  } catch (err) {
    console.log('Error: ', err);
  }
}
