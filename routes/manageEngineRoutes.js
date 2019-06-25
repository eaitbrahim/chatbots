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
  console.log('phonenumber:', phonenumber);
  if (data.queryResult.intent.displayName === 'CreateNewTicket') {
    var newTicket = {
      phonenumber,
      firstName: data.queryResult.parameters['given-name'],
      lastName: data.queryResult.parameters['last-name'],
      subject: data.queryResult.parameters['ticket-subject'],
      description: data.queryResult.parameters['ticket-description']
    };
    console.log('newTicket:', newTicket);
    result = await createTicket(newTicket);
  }

  if (data.queryResult.intent.displayName === 'Check Status') {
    var numberOfTickets = data.queryResult.parameters['number'];
    console.log('number of tickets requested:', numberOfTickets);
    result = await consultTicket(phonenumber, numberOfTickets);
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

async function consultTicket(phoneNumber, numberOfTickets) {
  try {
    var result = null;
    var response = { fulfillmentText: ' ', fulfillmentMessages: [] };
    if (numberOfTickets == '') {
      numberOfTickets = 1;
    }
    if (numberOfTickets > 10) {
      numberOfTickets = 10;
    }
    console.log('Number of tickets that will be used:', numberOfTickets);

    var requesterFullname = await getRequesterFullname(phoneNumber);
    var tickets = [];
    if (requesterFullname == null) {
      var text = {
        text: {
          text: [
            formatResponse([`On arrive pas à trouver un ticket pour vous.`])
          ]
        }
      };
      tickets.push(text);
      logData(phoneNumber, 'Consult', '', JSON.stringify(text));
    } else {
      console.log('consult by fullname:', requesterFullname);
      result = await consultByFullname(requesterFullname, numberOfTickets);
      if (result == null || result.data.requests.length == 0) {
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
              JSON.stringify({ subject, id, status, requester })
            );
            return stripIndent`
                                                    *Numéro de ticket: ${id}*.
                                                  👤Crée par: ${requester.name}.
                                                  🛠 Sujet de ticket: ${subject}.
                                                  🔖 Actuel Statut: ${
                                                    status.name
                                                  }.
                                                    `;
          })
          .value();

        tickets.push({ text: { text: [formatResponse(fulfillementText)] } });
      }
    }

    response.fulfillmentMessages = tickets;

    return response;
  } catch (err) {
    console.log('Error: ', err);
  }
}

async function consultByFullname(fullname, numberOfTickets) {
  try {
    var options = {
      headers: {
        Authorization: `${keys.manageEngineAuthToken}`,
        Accept: 'application/vnd.manageengine.sdp.v3+json'
      },
      params: {
        input_data: {
          list_info: {
            row_count: `${numberOfTickets}`,
            sort_field: 'created_time.display_value',
            search_fields: {
              'requester.name': `${fullname}`
            },
            sort_order: 'desc'
          }
        }
      }
    };
    return await axios.get(`${keys.manageEngineUrl}`, options);
  } catch (err) {
    console.log('err: ', err);
    return null;
  }
}

async function getRequesterFullname(phonenumber) {
  const manageEngineLog = new ManageEngineLog(keys.manageEngineLogSheetId);
  var result = await manageEngineLog.getFullname(phonenumber);
  console.log(
    `full name of ${phonenumber} is ${result != null ? result : 'not found'}`
  );
  return result;
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
