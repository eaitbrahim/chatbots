module.exports = ({ title, location, position, requiredprofile }) => {
  return `
    <!DOCTYPE html><html lang="fr">  <head>    <meta charset="utf-8" /> <meta      name="viewport"      content="width=device-width, initial-scale=1, shrink-to-fit=no"    />    <meta name="theme-color" content="#000000" /><link      rel="stylesheet"      href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css"    />    <link      href="https://fonts.googleapis.com/icon?family=Material+Icons"      rel="stylesheet"    />    <title>Majorel</title>  </head>  <body>    <noscript>You need to enable JavaScript to run this app.</noscript>    <div class="container">      <div style="text-align: center">        
    <blockquote>
          ${title} - ${location}
        </blockquote>
    <div class="card darken-1">          <div class="card-content">            <span class="card-title">Poste :</span>            <p>  ${position}                        </p>          </div>        </div>        <div class="card darken-1">          <div class="card-content">            <span class="card-title">Profil recherché :</span>            <p> ${requiredprofile}                        </p>          </div>        </div>      </div>    </div>    <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>  </body></html>
    `;
};
