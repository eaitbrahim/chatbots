const _ = require('lodash');
const { stripIndent } = require('common-tags');
const axios = require('axios');
const keys = require('../config/keys');

module.exports = app => {
  app.post('/api/requests', async (req, res) => {
    if (typeof req.body.originalDetectIntentRequest !== 'undefined') {
      var intent = req.body.queryResult.intent.displayName;
      var result = await processWhatsappData();
      var phonenumber = req.body.originalDetectIntentRequest.payload.data.From.split(
        ':'
      )[1];

      if (
        req.body.queryResult.intent.displayName === 'UserProvidesDescription'
      ) {
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

        result = await createTicket({
          phonenumber,
          firstName,
          lastName,
          subject,
          description
        });
      }

      if (req.body.queryResult.intent.displayName === 'Check Status') {
        var ticketNumber = req.body.queryResult.queryText;
        result = await consultTicket(ticketNumber, phonenumber);
      }

      res.json(result);
    } else {
      try {
        const { Number, Full_name, Phone_Number, Subject, Status } = req.body;
        const message = `Hi ${Full_name}, the status of ticket number ${Number} (${Subject}) has been changed to ${Status}`;
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

function processWhatsappData() {}

function processTicketChanges() {}

async function createTicket(ticket) {
  var response = { fulfillmentText: '' };
  var { phonenumber, firstName, lastName, subject, description } = ticket;

  try {
    var newRequest = await axios.post(`${keys.manageEngineUrl}`, {
      headers: {
        Authorization: `${keys.manageEngineAuthToken}`,
        Accept: 'application/vnd.manageengine.sdp.v3+json'
      },
      input_data: {
        request: {
          subject,
          description,
          requester: {
            phone: `${phonenumber}`,
            name: `${firstName} ${lastName}`
          }
        }
      }
    });

    response.fulfillmentText = formatResponse([
      stripIndent`
                                        🛠 Votre ticket a été créé avec succès. 
                                        * Son numéro de ticket est ${
                                          newRequest.data.request.id
                                        }*`
    ]);
  } catch (err) {
    console.log('Error: ', err);
  }

  return response;
}

async function consultTicket(ticketNumber, phoneNumber) {
  try {
    var tickets = [];
    var response = { fulfillmentText: ' ', fulfillmentMessages: [] };
    if (ticketNumber != 'undefined' && ticketNumber != '') {
      try {
        var requestDetail = await axios.get(
          `${keys.manageEngineUrl}/${ticketNumber}`,
          {
            headers: {
              Authorization: `${keys.manageEngineAuthToken}`,
              Accept: 'application/vnd.manageengine.sdp.v3+json'
            }
          }
        );

        var { subject, requester, status } = requestDetail.data.request;
        response.fulfillmentText = formatResponse([
          stripIndent`
                                      *Numéro de ticket: ${ticketNumber}*.
                                     👤Crée par: ${requester.name}.
                                     🛠 Sujet de ticket: ${subject}. 
                                     🔖 Actuel Statut: ${status.name}. 
                                      `
        ]);
      } catch (err) {
        response.fulfillmentText = formatResponse([
          stripIndent`
                                      *Le numéro: ${ticketNumber} n'existe pas pour un ticket.*
                                      `
        ]);
      }
    } else {
      var results = await axios.get(`${keys.manageEngineUrl}`, {
        headers: {
          Authorization: `${keys.manageEngineAuthToken}`,
          Accept: 'application/vnd.manageengine.sdp.v3+json'
        },
        params: {
          input_data: {
            list_info: {
              row_count: '3',
              sort_field: 'created_time.display_value',
              search_fields: {
                'requester.phone': `${phoneNumber}`
              },
              sort_order: 'desc'
            }
          }
        }
      });

      if (results.data.requests.length == 0) {
        tickets.push({
          text: {
            text: [
              formatResponse([
                `Aucun ticket associé au numéro de téléphone :${phoneNumber}`
              ])
            ]
          }
        });
      } else {
        var fulfillementText = _.chain(results.data.requests)
          .map(({ subject, id, status }) => {
            return stripIndent`
                                                    *Numéro de ticket: ${id}*
                                                    🛠 ${subject}
                                                    🔖 Status: ${status.name}
                                                `;
          })
          .value();

        tickets.push({ text: { text: [formatResponse(fulfillementText)] } });
      }

      response.fulfillmentMessages = tickets;
    }

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
