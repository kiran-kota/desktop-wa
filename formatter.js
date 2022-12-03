const phoneNumberFormatter = function(number) {
    let formatted = number.replace(/\D/g, '');

    if (formatted.startsWith('0')) {
      formatted = '91' + formatted.substr(1);
    }

    if(number.length == 10){
      number += '91';
    }
  
    if (!formatted.endsWith('@c.us')) {
      formatted += '@c.us';
    }
    return formatted;
  }
  
  module.exports = {
    phoneNumberFormatter
  }