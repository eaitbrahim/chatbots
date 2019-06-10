const _ = require('lodash');
const { stripIndent } = require('common-tags');
const axios = require('axios');
const keys = require('../config/keys');

module.exports = app => {
  app.post('/api/requests', async (req, res) => {
    if (typeof req.body.originalDetectIntentRequest !== 'undefined') {
      var result = await processWhatsappData(req.body);
      res.json(result);
    } else {
      processTicketChanges(req.body);
    }
  });
};

async function processWhatsappData(data) {
  var result = {};
  var phonenumber = data.originalDetectIntentRequest.payload.data.From.split(
    ':'
  )[1];

  if (data.queryResult.intent.displayName === 'UserProvidesDescription') {
    var newTicket = {
      phonenumber,
      firstName: data.queryResult.outputContexts[0].parameters['given-name'],
      lastName: data.queryResult.outputContexts[0].parameters['last-name'],
      subject: data.queryResult.outputContexts[0].parameters['ticket-subject'],
      description:
        data.queryResult.outputContexts[0].parameters['ticket-description']
    };

    result = await createTicket(newTicket);
  }

  if (data.queryResult.intent.displayName === 'Check Status') {
    var ticketNumber = data.queryResult.parameters['number'];
    console.log('Received ticket number:', ticketNumber);
    result = await consultTicket(ticketNumber, phonenumber);
  }
  return result;
}

function processTicketChanges({
  Number,
  Full_Full_namename,
  Phone_Number,
  Subject,
  Status
} = {}) {
  try {
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

async function createTicket({
  phonenumber,
  firstName,
  lastName,
  subject,
  description
} = {}) {
  var response = { fulfillmentText: '' };
  const options = {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `${keys.manageEngineAuthToken}`,
      Accept: 'application/vnd.manageengine.sdp.v3+json'
    },
    params: {
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
    },
    url: `${keys.manageEngineUrl}`
  };
  try {
    var newRequest = await axios(options);

    response.fulfillmentText = formatResponse([
      stripIndent`
                                        🛠 Votre ticket a été créé avec succès. 
                                        * Son numéro de ticket est ${
                                          newRequest.data.request.id
                                        }*`
    ]);
  } catch (err) {
    console.log('Error: ', err);
    response.fulfillmentText = formatResponse([
      stripIndent`⛔️ *Impossible de créer votre ticket pour le moment! Veuillez réessayer plus tard.*`
    ]);
  }

  return response;
}

async function consultTicket(ticketNumber, phoneNumber) {
  try {
    var result = null;
    var response = { fulfillmentText: ' ', fulfillmentMessages: [] };
    if (ticketNumber != 'undefined' && ticketNumber != '') {
      console.log('Consult by ticket number');
      result = await consultByTicketNumber(ticketNumber);
      console.log('result:', result);
      if (result != null) {
        response.fulfillmentText = formatResponse([
          stripIndent`
                                              *Numéro de ticket: ${ticketNumber}*.
                                            👤Crée par: ${
                                              result.requester.name
                                            }.
                                            🛠 Sujet de ticket: ${
                                              result.subject
                                            }. 
                                            🔖 Actuel Statut: ${
                                              result.status.name
                                            }. 
                                              `
        ]);
      } else {
        response.fulfillmentText = formatResponse([
          stripIndent`
                                      *Le numéro: ${ticketNumber} n'existe pas pour un ticket.*
                                      `
        ]);
      }
    } else {
      console.log('consult by phone number');
      result = await consultByPhoneNumber(phoneNumber);
      var tickets = [];
      if (result == null) {
        tickets.push({
          text: {
            text: [
              formatResponse([`On arrive pas à trouver un ticket pour vous.`])
            ]
          }
        });
      } else if (result.data.requests.length == 0) {
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
        var fulfillementText = _.chain(result.data.requests)
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

async function consultByTicketNumber(ticketNumber) {
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

    return requestDetail.data.request;
  } catch (err) {
    console.log('err: ', err);
    return null;
  }
}

async function consultByPhoneNumber(phoneNumber) {
  try {
    return await axios.get(`${keys.manageEngineUrl}`, {
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
  } catch (err) {
    console.log('err: ', err);
    return null;
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
