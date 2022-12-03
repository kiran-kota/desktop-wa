const { phoneNumberFormatter } = require('./formatter');
const venom = require('venom-bot');
const schedule = require('node-schedule');
const { google } = require("googleapis");

let id = 'test';
let waclient;

function createWebClient(){
    venom.create(
        id, 
        (base64Qrimg, asciiQR, attempts, urlCode) => {
            waclient = null;       
        },
        (statusSession, session) => {
            console.log('Status Session: ', statusSession);
            console.log('Session name: ', session); 
        },
        {
        multidevice: true,
        folderNameToken: 'tokens',
        headless: true,
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: true,
        browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
        disableSpins: true, 
        disableWelcome: true, 
        updatesLog: true,
        autoClose: 0,
        createPathFileToken: true,
        //chromiumVersion: '818858',
        waitForLogin: true
        },
        (browser, waPage) => {
            console.log('Browser PID:', browser.process().pid);
            waPage.screenshot({ path: 'screenshot.png' });
        }
    ).then(async (client)=>{ 
        waclient = client; 
        await getSheetDetails("1MRrs28J66cWwr_uzQ2lkOwErz3_UCU52bB4CNZOrOWE", "messages");  
    }).catch((erro)=>{
        console.log(erro);
    });
}

createWebClient();

const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });

numToChar = function (number) {
    var numeric = (number - 1) % 26;
    var letter = chr(65 + numeric);
    var number2 = parseInt((number - 1) / 26);
    if (number2 > 0) {
        return numToChar(number2) + letter;
    } else {
        return letter;
    }
}
chr = function (codePt) {
    if (codePt > 0xFFFF) {
        codePt -= 0x10000;
        return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
    }
    return String.fromCharCode(codePt);
}


dt = function(){
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let hours = date_ob.getHours();
    let minutes = date_ob.getMinutes();
    let seconds = date_ob.getSeconds();
    return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

async function getSheetDetails(spreadsheetId, sheetName) {
    try {        
        const client = await auth.getClient();
        const googleSheets = google.sheets({
        version: "v4",
        auth: client
        });
        const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: sheetName,
        });
        let values = getRows.data.values;
    
        let rows = getRows.data.values[0];
    
        if (values.length > 0) {
            let f = rows.indexOf("STATUS");
            let f1 = rows.indexOf("DATE_SENT");
            let i = values.findIndex(x=>x[f] == "PENDING");
            let val = i > -1 ? values[i] : null;
            let k = i + 1;
            if(val != null){
                console.log('new message ', val);
                let p = rows.indexOf("MOBILE_NO");
                let d = rows.indexOf("MESSAGE");
                let m = rows.indexOf("MEDIA_URL");
                const l = numToChar(f + 1);
                const l1 = numToChar(f1 + 1);
                const df = dt();
                let mob_no = val[p];
                let msg_p = val[d];
                let media_url = val[m];

                let sendMsgObj = {
                    number: mob_no.toString(),
                    message: msg_p,
                    sender: media_url == '' || media_url == null || media_url == undefined ? 'text' : 'media',
                    file: media_url,
                    filename: ""
                }
                var result = await sendMessage(sendMsgObj);
               
                if(result.status != null){
                    var sts = result.status == true ? "SENT" : "INVALID MOBILE" ;
                    googleSheets.spreadsheets.values.update({
                        auth,
                        spreadsheetId,
                        range: `${sheetName}!${l}${k}:${l1}${k}`,
                        valueInputOption: "USER_ENTERED",
                        resource: {
                            values: [
                                [sts, df]
                            ],
                        },
                    });
                    setTimeout(async ()=>await getSheetDetails("1MRrs28J66cWwr_uzQ2lkOwErz3_UCU52bB4CNZOrOWE", "messages"), 7*1000);
                }
            }else{
                setTimeout(async ()=>await getSheetDetails("1MRrs28J66cWwr_uzQ2lkOwErz3_UCU52bB4CNZOrOWE", "messages"), 7*1000);
            }    
        }else{
            setTimeout(async ()=>await getSheetDetails("1MRrs28J66cWwr_uzQ2lkOwErz3_UCU52bB4CNZOrOWE", "messages"), 7*1000);
        }
    } catch (error) {
        console.error(error);
        setTimeout(async ()=>await getSheetDetails("1MRrs28J66cWwr_uzQ2lkOwErz3_UCU52bB4CNZOrOWE", "messages"), 7*1000);
    }
}

async function sendMessage(sendObj) {
    try {
        var report = null;
        const number = phoneNumberFormatter(sendObj.number);
        const message = sendObj.message;
        const sender = sendObj.sender;
        const file = sendObj.file;
        const filename = sendObj.filename;

        if(waclient == null || waclient == undefined){
            return {status: null, message: 'client not available'}; 
        }
        const chat = await waclient?.checkNumberStatus(number).then((result) =>result).catch((err) => console.error(err, 'error'));
        if(chat == null || chat == undefined){
            return {status: false, message: 'invalid mobile number'};
        }
        if(sender == "text"){
           report = await waclient.sendText(number, message).then((result) => result).catch((err) => console.error(err, 'error'));
        } 
        if(sender == "media"){
           report = await waclient.sendFile(number, file, filename, message).then((result) => result).catch((err) => console.error(err, 'error'));
        }
        if(report == null || report == undefined){
            return {status: null, message: 'something went wrong'}; 
        }
        return {status: true, message: 'message sent successfully'};
    } catch (error) {
        console.error(error);   
        return {status: null, message: 'client not available'}; 
    }
}

// const job = schedule.scheduleJob("*/10 * * * * *", async function(){
//     if(waclient != null && waclient != undefined){
//         await getSheetDetails("1MRrs28J66cWwr_uzQ2lkOwErz3_UCU52bB4CNZOrOWE", "messages");
//     }
//  }); 