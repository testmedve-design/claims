/**
 * Convert a number to words (Indian numbering system)
 * Supports numbers up to 99 crores
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
]

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
]

function convertHundreds(num: number): string {
  let result = ''
  
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred '
    num %= 100
  }
  
  if (num >= 20) {
    result += tens[Math.floor(num / 10)] + ' '
    num %= 10
  }
  
  if (num > 0) {
    result += ones[num] + ' '
  }
  
  return result.trim()
}

export function convertNumberToWords(num: number): string {
  if (num === 0) return 'Zero'
  if (num < 0) return 'Negative ' + convertNumberToWords(-num)
  
  let result = ''
  const numStr = Math.floor(num).toString()
  
  // Handle crores
  if (numStr.length > 7) {
    const crores = Math.floor(num / 10000000)
    result += convertHundreds(crores) + ' Crore '
    num %= 10000000
  }
  
  // Handle lakhs
  if (numStr.length > 5 || num >= 100000) {
    const lakhs = Math.floor(num / 100000)
    result += convertHundreds(lakhs) + ' Lakh '
    num %= 100000
  }
  
  // Handle thousands
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000)
    result += convertHundreds(thousands) + ' Thousand '
    num %= 1000
  }
  
  // Handle hundreds, tens, and ones
  if (num > 0) {
    result += convertHundreds(num)
  }
  
  // Handle decimal part
  const decimalPart = num - Math.floor(num)
  if (decimalPart > 0) {
    const decimalStr = decimalPart.toFixed(2).split('.')[1]
    result += ' Point '
    for (let i = 0; i < decimalStr.length; i++) {
      result += ones[parseInt(decimalStr[i])] + ' '
    }
  }
  
  return result.trim() || 'Zero'
}


