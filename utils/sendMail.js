const nodemailer = require("nodemailer");

const sendMail = async (options) => {
    const transporter = nodemailer.createTransport({
        service:'gmail',
        host:'smtp.gmail.com',
        port:465,
        secureConnection:true,
        auth:{
            type:"OAuth2",
            user: process.env.SMPT_MAIL,
            pass:process.env.SMPT_PASSWORD,
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            refreshToken: process.env.OAUTH_REFRESH_TOKEN

        },
    });

    const mailOptions = {
        from: process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html:options.html
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendMail;