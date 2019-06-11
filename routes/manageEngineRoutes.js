const _ = require('lodash');
const { stripIndent } = require('common-tags');
const axios = require('axios');
const keys = require('../config/keys');
const ManageEngineLog = require('../services/manageEngineLogs');

module.exports = app => {
  app.post('/api/requests', async (req, res) => {
    console.log('Received body:', req.body);
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

  if (
    data.queryResult.intent.displayName ===
    'UserProvidesDescription-CreateTicket'
  ) {
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
  Full_name,
  Phone_number,
  Subject,
  Status
} = {}) {
  try {
    console.log('received data from webhook:', {
      Number,
      Full_name,
      Phone_number,
      Subject,
      Status
    });
    const message = `Hi ${Full_name}, the status of ticket number ${Number} (${Subject}) has been changed to ${Status}`;
    const twilioClient = require('twilio')(
      keys.twilioAccountSid,
      keys.twilioAuthToken
    );
    var phoneNumberArr = Phone_number.split('+');
    twilioClient.messages
      .create({
        from: 'whatsapp:+14155238886',
        body: message,
        to: `whatsapp:+${
          phoneNumberArr.length > 1 ? phoneNumberArr[1] : Phone_number
        }`
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
    logData(
      phonenumber,
      'Create',
      `${firstName} ${lastName}`,
      JSON.stringify(newRequest.data.request)
    );
    response.fulfillmentText = formatResponse([
      stripIndent`
                                        🛠 Votre ticket a été créé avec succès. 
                                        *Son numéro de ticket est ${
                                          newRequest.data.request.id
                                        }*
                                        `
    ]);
  } catch (err) {
    console.log('Error: ', err);
    response.fulfillmentText = formatResponse([
      stripIndent`⛔️ *Impossible de créer votre ticket pour le moment! Veuillez réessayer plus tard.*`
    ]);
    logData(
      phonenumber,
      'Create',
      `${firstName} ${lastName}`,
      JSON.stringify(err)
    );
  }

  return response;
}

async function consultTicket(ticketNumber, phoneNumber) {
  try {
    var result = null;
    var response = { fulfillmentText: ' ', fulfillmentMessages: [] };
    // if (ticketNumber != 'undefined' && ticketNumber != '') {
    //   console.log('Consult by ticket number');
    //   result = await consultByTicketNumber(ticketNumber);
    //   if (result != null) {
    //     response.fulfillmentText = formatResponse([
    //       stripIndent`
    //                                           *Numéro de ticket: ${ticketNumber}*.
    //                                         👤Crée par: ${
    //                                           result.requester.name
    //                                         }.
    //                                         🛠 Sujet de ticket: ${
    //                                           result.subject
    //                                         }.
    //                                         🔖 Actuel Statut: ${
    //                                           result.status.name
    //                                         }.
    //                                           `
    //     ]);

    //     return response;
    //   }
    // }

    console.log('Consult by phone number:', phoneNumber);
    result = await consultByPhoneNumber(phoneNumber);
    var tickets = [];
    if (result == null) {
      var text = {
        text: {
          text: [
            formatResponse([`On arrive pas à trouver un ticket pour vous.`])
          ]
        }
      };
      tickets.push(text);
      logData(phoneNumber, 'Consult', '', JSON.stringify(text));
    } else if (result.data.requests.length == 0) {
      var text = {
        text: {
          text: [
            formatResponse([
              `Aucun ticket associé au numéro de téléphone :${phoneNumber}`
            ])
          ]
        }
      };
      tickets.push(text);
      logData(phoneNumber, 'Consult', '', JSON.stringify(text));
    } else {
      var fulfillementText = _.chain(result.data.requests)
        .map(({ subject, id, status, requester }) => {
          logData(
            phoneNumber,
            'Consult',
            requester.name,
            JSON.stringify({ subject, id, status })
          );
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
    var options = {
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
    };
    await axios.get(`${keys.manageEngineUrl}`, options);
  } catch (err) {
    console.log('err: ', err);
    return null;
  }
}

function logData(phonenumber, action, fullname = '', data = '') {
  const manageEngineLog = new ManageEngineLog(keys.manageEngineLogSheetId);
  manageEngineLog.submitLog({
    fullname,
    phonenumber,
    action,
    data
  });
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
