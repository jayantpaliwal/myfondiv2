export const messages = {
	'email': [
		{ type: 'required', message: 'Email is required.' },
		{ type: 'pattern', message: 'Email address not valid.' }
	],
	'password': [
		{ type: 'required', message: 'Password is required.' },
		{ type: 'pattern', message: 'Password must contain 8 characters containing at least 1 letter, 1 number, and 1 special character.'}
	],
	'confirmPassword': [
		{ type: 'required', message: 'Password is required.' },
		{ type: 'equalTo', message: 'Password and confirm password does not match' }
	],
	'name': [
		{ type: 'required', message: 'Full name is required.' }	
	],
	"paycheckName": [
		{ type: 'required', message: 'Paycheck name is required.' }	
	],
	"payDate": [
		{ type: 'required', message: 'Next pay Date is required.' }	
	],
	"payAmount": [
		{ type: 'required', message: 'pay Amount is required.' },
		{ type: 'min', message: 'pay Amount  must be greater than 0' }	
	],
	"existingPayChecks": [
		{ type: 'required', message: 'Choose existing paychecks' }	
	],
	"incomeName": [
		{ type: 'required', message: 'Income Name is required' }	
	],
	"expenseName": [
		{ type: 'required', message: 'Expense Name is required' }	
	],
	"category": [
		{ type: 'required', message: 'Category is required' }	
	],
	"date": [
		{ type: 'required', message: 'Date is required' }	
	],
	"amount": [
		{ type: 'required', message: 'Amount is required.' },
		{ type: 'min', message: 'Amount must be greater than 0' }		
	],
	"age": [
		{ type: 'required', message: 'Age is required.' }
	],
	"contact": [
		{ type: 'required', message: 'Phone Number is required.' }		
	],
	"zip_code": [
		{ type: 'required', message: 'Zip Code is required.' }		
	],
	"incomeSource": [
		{ type: 'required', message: 'Income Source is required.' }		
	],
	"transactionSource": [
		{ type: 'required', message: 'Transaction Source is required.' }		
	],
};