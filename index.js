const express = require('express');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Carga variables de entorno
dotenv.config();

const app = express();

// Conexión a MongoDB
mongoose.connect(process.env.DB_URI, { dbName: 'tarifasDB' })
  .then(() => console.log('MongoDB Connected to tarifasDB'))
  .catch(err => console.log(err));

// Middleware para body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');

// Directorio público para archivos estáticos
app.use(express.static('public'));

// Modelo de tarifa
const tarifaSchema = new mongoose.Schema({
  puerto_origen: String,
  puerto_destino: String,
  producto: String,
  tarifa: Number
});

const Tarifa = mongoose.model('tarifa', tarifaSchema, 'tarifas'); // Asegúrate de especificar el nombre de la colección si es necesario

// Definición de la función enviarSolicitudCotizacion
function enviarSolicitudCotizacion(data) {
  const proveedores = [
      'ventas2@consolcargo.com',
      'sales6@mahe.com.co',
      'nathaly.torres@andeslogistics.com'
  ];

  const transporter = nodemailer.createTransport({
      service: 'zoho', 
      auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
      }
  });

  proveedores.forEach(proveedor => {
      const mailOptions = {
          from: process.env.EMAIL_USER,
          to: proveedor,
          subject: 'Solicitud de Cotización para Envío',
          text: `Se solicita cotización para un envío con las siguientes características:\nPuerto origen: ${data.puerto_origen}\nPuerto destino: ${data.puerto_destino}\nProducto: ${data.producto}\nPor favor, enviar la cotización a nuestra empresa.`
      };

      transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
              console.log('Error al enviar correo a proveedor:', error);
          } else {
              console.log('Correo de solicitud enviado a ' + proveedor + ': ' + info.response);
          }
      });
  });
}

const PDFDocument = require('pdfkit');
const fs = require('fs');

function generarPDF(tarifa, datosCarga, emailCliente) {
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        enviarEmailConPDF(emailCliente, pdfData);
    });

    doc.fontSize(12).text('Cotización Comercio Internacional', { underline: true });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`);
    doc.text(`Información de la carga:\n${datosCarga}`);
    doc.text(`Tarifa: ${tarifa}`);
    doc.end();
}

function enviarEmailConPDF(email, content) {
    const transporter = nodemailer.createTransport({
        service: 'zoho',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Su cotización de PriEasyng',
        attachments: [{
            filename: 'cotizacion.pdf',
            content
        }],
        text: 'Encuentre adjunta la cotización solicitada.'
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log('Error al enviar el correo:', error);
        } else {
            console.log('Correo enviado: ' + info.response);
        }
    });
}

// Rutas
app.get('/', (req, res) => {
  res.render('index');
});

// Ruta para manejar POST de /quote
app.post('/quote', async (req, res) => {
  const { puerto_origen, puerto_destino, producto, email_cliente } = req.body;

  try {
    // Buscar en la base de datos si existe una tarifa que coincida con los criterios.
    const tarifa = await Tarifa.findOne({
      puerto_origen: puerto_origen,
      puerto_destino: puerto_destino,
      producto: producto
  });

  if (tarifa) {
    // Si existe una tarifa, proceder con la generación del PDF
    const datosCarga = `Puerto origen: ${puerto_origen}, Puerto destino: ${puerto_destino}, Producto: ${producto}`;
    generarPDF(tarifa.tarifa, datosCarga, email_cliente);
    res.send('Cotización enviada a su correo electrónico.');
} else {
    // Si no existe una tarifa, enviar correos a los proveedores solicitando cotización
    enviarSolicitudCotizacion(req.body);
    res.send('No se encontró tarifa disponible, se ha enviado una solicitud a los proveedores.');
}
function enviarSolicitudCotizacion(data) {
    const proveedores = [
        'ventas2@consolcargo.com',
        'sales6@mahe.com.co',
        'nathaly.torres@andeslogistics.com'
    ];

    const transporter = nodemailer.createTransport({
        service: 'zoho', // Asegúrate de cambiarlo por tu proveedor y credenciales reales
        auth: {
            user: process.env.EMAIL_USER, // Asegúrate de configurar esta variable en tu .env
            pass: process.env.EMAIL_PASS  // Asegúrate de configurar esta variable en tu .env
        }
    });

    proveedores.forEach(proveedor => {
        const mailOptions = {
            from: process.env.EMAIL_USER, // Tu correo electrónico registrado en el servicio de correo
            to: proveedor,
            subject: 'Solicitud de Cotización para Envío',
            text: `Se solicita cotización para un envío con las siguientes características:\nPuerto origen: ${data.puerto_origen}\nPuerto destino: ${data.puerto_destino}\nProducto: ${data.producto}\nPor favor, enviar la cotización a nuestra empresa.`
        };

        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                console.log('Error al enviar correo a proveedor:', error);
            } else {
                console.log('Correo de solicitud enviado a ' + proveedor + ': ' + info.response);
            }
        });
    });
}
} catch (error) {
console.error('Error al buscar la tarifa:', error);
res.status(500).send('Error procesando la solicitud');
}
});
  

// Definir más rutas aquí según sea necesario

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
