import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonProvider } from 'src/providers/common';
import * as firebase from 'firebase';
import { Storage } from '@ionic/storage';
import { Events } from '../Events.service';
import { FirebaseFunctionLocal } from '../firebase-api-local/firebase-api-local';
const url = "https://us-central1-myfondi-v2.cloudfunctions.net/"
@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public plaidTransaction;

  // --------------------------------manual categories mapping-----------------------
  categories = [
    // -------------------------------------------income categories------------------
    { "category_id": "20001000", "group": "special", "hierarchy": ["Tax", "Refund"] },
    { "category_id": "15001000", "group": "special", "hierarchy": ["Interest", "Interest Earned"] },
    { "category_id": "11000000", "group": "special", "hierarchy": ["Cash Advance"] },
    { "category_id": "15000000", "group": "special", "hierarchy": ["Interest"] },
    // ----------------------------------------------------------my fondi categories----------------------------
    {
      "category_id": "18009000",
      "group": "Home Expenses",
      "hierarchy": [
        "Cable"
      ]
    }, {
      "category_id": "18063000",
      "group": "Home Expenses",
      "hierarchy": [
        "Cell Phone"
      ]
    }, {
      "category_id": "18068005",
      "group": "Home Expenses",
      "hierarchy": [
        "Electric"
      ]
    },
    {
      "category_id": "18020005",
      "group": "Home Expenses",
      "hierarchy": [
        "Home Owners"
      ]
    },
    {
      "category_id": "18020006",
      "group": "Home Expenses",
      "hierarchy": [
        "Renters Insurance"
      ]
    },
    {
      "category_id": "18068003",
      "group": "Home Expenses",
      "hierarchy": [
        "Gas"
      ]
    },
    {
      "category_id": "18068004",
      "group": "Home Expenses",
      "hierarchy": [
        "Home"
      ]
    },
    {
      "category_id": "18031000",
      "group": "Home Expenses",
      "hierarchy": [
        "Internet"
      ]
    },
    {
      "category_id": "16002000",
      "group": "Home Expenses",
      "hierarchy": [
        "Mortgage"
      ]
    },
    {
      "category_id": "18020004",
      "group": "Home Expenses",
      "hierarchy": [
        "Rent"
      ]
    },
    {
      "category_id": "18057000",
      "group": "Home Expenses",
      "hierarchy": [
        "Security"
      ]
    },
    {
      "category_id": "18068001",
      "group": "Home Expenses",
      "hierarchy": [
        "Water"
      ]
    },
    {
      "category_id": "18068002",
      "group": "Home Expenses",
      "hierarchy": [
        "Sewage"
      ]
    },
    {
      "category_id": "18006000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Auto Maintenance"
      ]
    },
    {
      "category_id": "22009000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Gas - Car"
      ]
    },
    {
      "category_id": "19025000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Groceries"
      ]
    },
    {
      "category_id": "18024000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Home Maintenance"
      ]
    },
    {
      "category_id": "18030000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Insurance"
      ]
    },
    {
      "category_id": "22014000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Public Transportation"
      ]
    },
    {
      "category_id": "18061000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Subscriptions"
      ]
    },
    {
      "category_id": "22013000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Parking"
      ]
    },
    {
      "category_id": "22017000",
      "group": "Living Variable Expenses",
      "hierarchy": [
        "Tolls and Fees"
      ]
    },
    {
      "category_id": "16001000",
      "group": "Debt",
      "hierarchy": [
        "Credit Card"
      ]
    },
    {
      "category_id": "16003000",
      "group": "Debt",
      "hierarchy": [
        "Personal Loan"
      ]
    },
    {
      "category_id": "16003001",
      "group": "Debt",
      "hierarchy": [
        "Student Loans"
      ]
    },
    {
      "category_id": "16003002",
      "group": "Debt",
      "hierarchy": [
        "Auto Loan"
      ]
    },
    {
      "category_id": "12005001",
      "group": "Children Expense",
      "hierarchy": [
        "After School Activities"
      ]
    },
    {
      "category_id": "12005000",
      "group": "Children Expense",
      "hierarchy": [
        "Daycare"
      ]
    },
    {
      "category_id": "12008001",
      "group": "Children Expense",
      "hierarchy": [
        "School"
      ]
    },
    {
      "category_id": "12008002",
      "group": "Children Expense",
      "hierarchy": [
        "Sports"
      ]
    },
    {
      "category_id": "19028000",
      "group": "Savings",
      "hierarchy": [
        "Gifts"
      ]
    },
    {
      "category_id": "19028001",
      "group": "Savings",
      "hierarchy": [
        "Vacation"
      ]
    },
    {
      "category_id": "19028002",
      "group": "Savings",
      "hierarchy": [
        "Emergency Fund"
      ]
    },
    {
      "category_id": "19028003",
      "group": "Savings",
      "hierarchy": [
        "Retirement"
      ]
    },
    {
      "category_id": "17018000",
      "group": "Life Expense",
      "hierarchy": [
        "Gym Membership"
      ]
    },
    {
      "category_id": "14000000",
      "group": "Life Expense",
      "hierarchy": [
        "Medical"
      ]
    },
    {
      "category_id": "18045000",
      "group": "Life Expense",
      "hierarchy": [
        "Personal Care"
      ]
    },
    {
      "category_id": "19043000",
      "range": "19043000-19043999",
      "group": "Life Expense",
      "hierarchy": [
        "Pharmacy"
      ]
    },
    {
      "category_id": "13000001",
      "group": "Other Expenses",
      "hierarchy": [
        "Charitable Contributions"
      ]
    },
    {
      "category_id": "13000000",
      "group": "Other Expenses",
      "hierarchy": [
        "Dining"
      ]
    },
    {
      "category_id": "10000000",
      "group": "Other Expenses",
      "hierarchy": [
        "Fees"
      ]
    },
    {
      "category_id": "18069000",
      "group": "Other Expenses",
      "hierarchy": [
        "Pets"
      ]
    },

    {
      "category_id": "19000000",
      "group": "Other Expenses",
      "hierarchy": [
        "Shopping"
      ]
    },
    {
      "category_id": "21000000",
      "group": "Other Expenses",
      "hierarchy": [
        "Transfers"
      ]
    },
    {
      "category_id": "22000000",
      "group": "Other Expenses",
      "hierarchy": [
        "Travel"
      ]
    },
    //-----------------------------------------------------------Uncategorized categories----------------------------------
    { "category_id": "12000000", "group": "place", "hierarchy": ["Community"] },
    { "category_id": "12001000", "group": "place", "hierarchy": ["Community", "Animal Shelter"] },
    { "category_id": "12002000", "group": "place", "hierarchy": ["Community", "Assisted Living Services"] },
    { "category_id": "12002001", "group": "place", "hierarchy": ["Community", "Assisted Living Services", "Facilities and Nursing Homes"] },
    { "category_id": "12002002", "group": "place", "hierarchy": ["Community", "Assisted Living Services", "Caretakers"] },
    { "category_id": "12003000", "group": "place", "hierarchy": ["Community", "Cemetery"] },
    { "category_id": "12004000", "group": "place", "hierarchy": ["Community", "Courts"] },
    { "category_id": "12006000", "group": "place", "hierarchy": ["Community", "Disabled Persons Services"] },
    { "category_id": "12007000", "group": "place", "hierarchy": ["Community", "Drug and Alcohol Services"] },
    { "category_id": "12008000", "group": "place", "hierarchy": ["Community", "Education"] },
    { "category_id": "12008004", "group": "place", "hierarchy": ["Community", "Education", "Fraternities and Sororities"] },
    { "category_id": "12008005", "group": "place", "hierarchy": ["Community", "Education", "Driving Schools"] },
    { "category_id": "12008006", "group": "place", "hierarchy": ["Community", "Education", "Dance Schools"] },
    { "category_id": "12008007", "group": "place", "hierarchy": ["Community", "Education", "Culinary Lessons and Schools"] },
    { "category_id": "12008008", "group": "place", "hierarchy": ["Community", "Education", "Computer Training"] },
    { "category_id": "12008009", "group": "place", "hierarchy": ["Community", "Education", "Colleges and Universities"] },
    { "category_id": "12008010", "group": "place", "hierarchy": ["Community", "Education", "Art School"] },
    { "category_id": "12008011", "group": "place", "hierarchy": ["Community", "Education", "Adult Education"] },
    { "category_id": "12009000", "group": "place", "hierarchy": ["Community", "Government Departments and Agencies"] },
    { "category_id": "12010000", "group": "place", "hierarchy": ["Community", "Government Lobbyists"] },
    { "category_id": "12011000", "group": "place", "hierarchy": ["Community", "Housing Assistance and Shelters"] },
    { "category_id": "12012000", "group": "place", "hierarchy": ["Community", "Law Enforcement"] },
    { "category_id": "12012001", "group": "place", "hierarchy": ["Community", "Law Enforcement", "Police Stations"] },
    { "category_id": "12012002", "group": "place", "hierarchy": ["Community", "Law Enforcement", "Fire Stations"] },
    { "category_id": "12012003", "group": "place", "hierarchy": ["Community", "Law Enforcement", "Correctional Institutions"] },
    { "category_id": "12013000", "group": "place", "hierarchy": ["Community", "Libraries"] },
    { "category_id": "12014000", "group": "place", "hierarchy": ["Community", "Military"] },
    { "category_id": "12015000", "group": "place", "hierarchy": ["Community", "Organizations and Associations"] },
    { "category_id": "12015001", "group": "place", "hierarchy": ["Community", "Organizations and Associations", "Youth Organizations"] },
    { "category_id": "12015002", "group": "place", "hierarchy": ["Community", "Organizations and Associations", "Environmental"] },
    { "category_id": "12015003", "group": "place", "hierarchy": ["Community", "Organizations and Associations", "Charities and Non-Profits"] },
    { "category_id": "12016000", "group": "place", "hierarchy": ["Community", "Post Offices"] },
    { "category_id": "12017000", "group": "place", "hierarchy": ["Community", "Public and Social Services"] },
    { "category_id": "12018000", "group": "place", "hierarchy": ["Community", "Religious"] },
    { "category_id": "12018001", "group": "place", "hierarchy": ["Community", "Religious", "Temple"] },
    { "category_id": "12018002", "group": "place", "hierarchy": ["Community", "Religious", "Synagogues"] },
    { "category_id": "12018003", "group": "place", "hierarchy": ["Community", "Religious", "Mosques"] },
    { "category_id": "12018004", "group": "place", "hierarchy": ["Community", "Religious", "Churches"] },
    { "category_id": "12019000", "group": "place", "hierarchy": ["Community", "Senior Citizen Services"] },
    { "category_id": "12019001", "group": "place", "hierarchy": ["Community", "Senior Citizen Services", "Retirement"] },
    { "category_id": "17000000", "group": "place", "hierarchy": ["Recreation"] },
    { "category_id": "17001000", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment"] },
    { "category_id": "17001001", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Theatrical Productions"] },
    { "category_id": "17001002", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Symphony and Opera"] },
    { "category_id": "17001003", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Sports Venues"] },
    { "category_id": "17001004", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Social Clubs"] },
    { "category_id": "17001005", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Psychics and Astrologers"] },
    { "category_id": "17001006", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Party Centers"] },
    { "category_id": "17001007", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Music and Show Venues"] },
    { "category_id": "17001008", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Museums"] },
    { "category_id": "17001009", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Movie Theatres"] },
    { "category_id": "17001010", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Fairgrounds and Rodeos"] },
    { "category_id": "17001011", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Entertainment"] },
    { "category_id": "17001012", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Dance Halls and Saloons"] },
    { "category_id": "17001013", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Circuses and Carnivals"] },
    { "category_id": "17001014", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Casinos and Gaming"] },
    { "category_id": "17001015", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Bowling"] },
    { "category_id": "17001016", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Billiards and Pool"] },
    { "category_id": "17001017", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Art Dealers and Galleries"] },
    { "category_id": "17001018", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Arcades and Amusement Parks"] },
    { "category_id": "17001019", "group": "place", "hierarchy": ["Recreation", "Arts and Entertainment", "Aquarium"] },
    { "category_id": "17002000", "group": "place", "hierarchy": ["Recreation", "Athletic Fields"] },
    { "category_id": "17003000", "group": "place", "hierarchy": ["Recreation", "Baseball"] },
    { "category_id": "17004000", "group": "place", "hierarchy": ["Recreation", "Basketball"] },
    { "category_id": "17005000", "group": "place", "hierarchy": ["Recreation", "Batting Cages"] },
    { "category_id": "17006000", "group": "place", "hierarchy": ["Recreation", "Boating"] },
    { "category_id": "17007000", "group": "place", "hierarchy": ["Recreation", "Campgrounds and RV Parks"] },
    { "category_id": "17008000", "group": "place", "hierarchy": ["Recreation", "Canoes and Kayaks"] },
    { "category_id": "17009000", "group": "place", "hierarchy": ["Recreation", "Combat Sports"] },
    { "category_id": "17010000", "group": "place", "hierarchy": ["Recreation", "Cycling"] },
    { "category_id": "17011000", "group": "place", "hierarchy": ["Recreation", "Dance"] },
    { "category_id": "17012000", "group": "place", "hierarchy": ["Recreation", "Equestrian"] },
    { "category_id": "17013000", "group": "place", "hierarchy": ["Recreation", "Football"] },
    { "category_id": "17014000", "group": "place", "hierarchy": ["Recreation", "Go Carts"] },
    { "category_id": "17015000", "group": "place", "hierarchy": ["Recreation", "Golf"] },
    { "category_id": "17016000", "group": "place", "hierarchy": ["Recreation", "Gun Ranges"] },
    { "category_id": "17017000", "group": "place", "hierarchy": ["Recreation", "Gymnastics"] },
    { "category_id": "17019000", "group": "place", "hierarchy": ["Recreation", "Hiking"] },
    { "category_id": "17020000", "group": "place", "hierarchy": ["Recreation", "Hockey"] },
    { "category_id": "17021000", "group": "place", "hierarchy": ["Recreation", "Hot Air Balloons"] },
    { "category_id": "17022000", "group": "place", "hierarchy": ["Recreation", "Hunting and Fishing"] },
    { "category_id": "17023000", "group": "place", "hierarchy": ["Recreation", "Landmarks"] },
    { "category_id": "17023001", "group": "place", "hierarchy": ["Recreation", "Landmarks", "Monuments and Memorials"] },
    { "category_id": "17023002", "group": "place", "hierarchy": ["Recreation", "Landmarks", "Historic Sites"] },
    { "category_id": "17023003", "group": "place", "hierarchy": ["Recreation", "Landmarks", "Gardens"] },
    { "category_id": "17023004", "group": "place", "hierarchy": ["Recreation", "Landmarks", "Buildings and Structures"] },
    { "category_id": "17024000", "group": "place", "hierarchy": ["Recreation", "Miniature Golf"] },
    { "category_id": "17025000", "group": "place", "hierarchy": ["Recreation", "Outdoors"] },
    { "category_id": "17025001", "group": "place", "hierarchy": ["Recreation", "Outdoors", "Rivers"] },
    { "category_id": "17025002", "group": "place", "hierarchy": ["Recreation", "Outdoors", "Mountains"] },
    { "category_id": "17025003", "group": "place", "hierarchy": ["Recreation", "Outdoors", "Lakes"] },
    { "category_id": "17025004", "group": "place", "hierarchy": ["Recreation", "Outdoors", "Forests"] },
    { "category_id": "17025005", "group": "place", "hierarchy": ["Recreation", "Outdoors", "Beaches"] },
    { "category_id": "17026000", "group": "place", "hierarchy": ["Recreation", "Paintball"] },
    { "category_id": "17027000", "group": "place", "hierarchy": ["Recreation", "Parks"] },
    { "category_id": "17027001", "group": "place", "hierarchy": ["Recreation", "Parks", "Playgrounds"] },
    { "category_id": "17027002", "group": "place", "hierarchy": ["Recreation", "Parks", "Picnic Areas"] },
    { "category_id": "17027003", "group": "place", "hierarchy": ["Recreation", "Parks", "Natural Parks"] },
    { "category_id": "17028000", "group": "place", "hierarchy": ["Recreation", "Personal Trainers"] },
    { "category_id": "17029000", "group": "place", "hierarchy": ["Recreation", "Race Tracks"] },
    { "category_id": "17030000", "group": "place", "hierarchy": ["Recreation", "Racquet Sports"] },
    { "category_id": "17031000", "group": "place", "hierarchy": ["Recreation", "Racquetball"] },
    { "category_id": "17032000", "group": "place", "hierarchy": ["Recreation", "Rafting"] },
    { "category_id": "17033000", "group": "place", "hierarchy": ["Recreation", "Recreation Centers"] },
    { "category_id": "17034000", "group": "place", "hierarchy": ["Recreation", "Rock Climbing"] },
    { "category_id": "17035000", "group": "place", "hierarchy": ["Recreation", "Running"] },
    { "category_id": "17036000", "group": "place", "hierarchy": ["Recreation", "Scuba Diving"] },
    { "category_id": "17037000", "group": "place", "hierarchy": ["Recreation", "Skating"] },
    { "category_id": "17038000", "group": "place", "hierarchy": ["Recreation", "Skydiving"] },
    { "category_id": "17039000", "group": "place", "hierarchy": ["Recreation", "Snow Sports"] },
    { "category_id": "17040000", "group": "place", "hierarchy": ["Recreation", "Soccer"] },
    { "category_id": "17041000", "group": "place", "hierarchy": ["Recreation", "Sports and Recreation Camps"] },
    { "category_id": "17042000", "group": "place", "hierarchy": ["Recreation", "Sports Clubs"] },
    { "category_id": "17043000", "group": "place", "hierarchy": ["Recreation", "Stadiums and Arenas"] },
    { "category_id": "17044000", "group": "place", "hierarchy": ["Recreation", "Swimming"] },
    { "category_id": "17045000", "group": "place", "hierarchy": ["Recreation", "Tennis"] },
    { "category_id": "17046000", "group": "place", "hierarchy": ["Recreation", "Water Sports"] },
    { "category_id": "17047000", "group": "place", "hierarchy": ["Recreation", "Yoga and Pilates"] },
    { "category_id": "17048000", "group": "place", "hierarchy": ["Recreation", "Zoo"] },
    { "category_id": "18000000", "group": "place", "hierarchy": ["Service"] },
    { "category_id": "18001000", "group": "place", "hierarchy": ["Service", "Advertising and Marketing"] },
    { "category_id": "18001001", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Writing, Copywriting and Technical Writing"] },
    { "category_id": "18001002", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Search Engine Marketing and Optimization"] },
    { "category_id": "18001003", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Public Relations"] },
    { "category_id": "18001004", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Promotional Items"] },
    { "category_id": "18001005", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Print, TV, Radio and Outdoor Advertising"] },
    { "category_id": "18001006", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Online Advertising"] },
    { "category_id": "18001007", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Market Research and Consulting"] },
    { "category_id": "18001008", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Direct Mail and Email Marketing Services"] },
    { "category_id": "18001009", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Creative Services"] },
    { "category_id": "18001010", "group": "place", "hierarchy": ["Service", "Advertising and Marketing", "Advertising Agencies and Media Buyers"] },
    { "category_id": "18003000", "group": "place", "hierarchy": ["Service", "Art Restoration"] },
    { "category_id": "18004000", "group": "place", "hierarchy": ["Service", "Audiovisual"] },
    { "category_id": "18005000", "group": "place", "hierarchy": ["Service", "Automation and Control Systems"] },
    { "category_id": "18007000", "group": "place", "hierarchy": ["Service", "Business and Strategy Consulting"] },
    { "category_id": "18008000", "group": "place", "hierarchy": ["Service", "Business Services"] },
    { "category_id": "18008001", "group": "place", "hierarchy": ["Service", "Business Services", "Printing and Publishing"] },
    { "category_id": "18010000", "group": "place", "hierarchy": ["Service", "Chemicals and Gasses"] },
    { "category_id": "18011000", "group": "place", "hierarchy": ["Service", "Cleaning"] },
    { "category_id": "18012000", "group": "place", "hierarchy": ["Service", "Computers"] },
    { "category_id": "18012001", "group": "place", "hierarchy": ["Service", "Computers", "Maintenance and Repair"] },
    { "category_id": "18012002", "group": "place", "hierarchy": ["Service", "Computers", "Software Development"] },
    { "category_id": "18013000", "group": "place", "hierarchy": ["Service", "Construction"] },
    { "category_id": "18013001", "group": "place", "hierarchy": ["Service", "Construction", "Specialty"] },
    { "category_id": "18013002", "group": "place", "hierarchy": ["Service", "Construction", "Roofers"] },
    { "category_id": "18013003", "group": "place", "hierarchy": ["Service", "Construction", "Painting"] },
    { "category_id": "18013004", "group": "place", "hierarchy": ["Service", "Construction", "Masonry"] },
    { "category_id": "18013005", "group": "place", "hierarchy": ["Service", "Construction", "Infrastructure"] },
    { "category_id": "18013006", "group": "place", "hierarchy": ["Service", "Construction", "Heating, Ventilating and Air Conditioning"] },
    { "category_id": "18013007", "group": "place", "hierarchy": ["Service", "Construction", "Electricians"] },
    { "category_id": "18013008", "group": "place", "hierarchy": ["Service", "Construction", "Contractors"] },
    { "category_id": "18013009", "group": "place", "hierarchy": ["Service", "Construction", "Carpet and Flooring"] },
    { "category_id": "18013010", "group": "place", "hierarchy": ["Service", "Construction", "Carpenters"] },
    { "category_id": "18014000", "group": "place", "hierarchy": ["Service", "Credit Counseling and Bankruptcy Services"] },
    { "category_id": "18015000", "group": "place", "hierarchy": ["Service", "Dating and Escort"] },
    { "category_id": "18016000", "group": "place", "hierarchy": ["Service", "Employment Agencies"] },
    { "category_id": "18017000", "group": "place", "hierarchy": ["Service", "Engineering"] },
    { "category_id": "18018000", "group": "place", "hierarchy": ["Service", "Entertainment"] },
    { "category_id": "18018001", "group": "place", "hierarchy": ["Service", "Entertainment", "Media"] },
    { "category_id": "18019000", "group": "place", "hierarchy": ["Service", "Events and Event Planning"] },
    { "category_id": "18020000", "group": "place", "hierarchy": ["Service", "Financial"] },
    { "category_id": "18020001", "group": "place", "hierarchy": ["Service", "Financial", "Taxes"] },
    { "category_id": "18020002", "group": "place", "hierarchy": ["Service", "Financial", "Student Aid and Grants"] },
    { "category_id": "18020003", "group": "place", "hierarchy": ["Service", "Financial", "Stock Brokers"] },
    { "category_id": "18020005", "group": "place", "hierarchy": ["Service", "Financial", "Holding and Investment Offices"] },
    { "category_id": "18020006", "group": "place", "hierarchy": ["Service", "Financial", "Fund Raising"] },
    { "category_id": "18020007", "group": "place", "hierarchy": ["Service", "Financial", "Financial Planning and Investments"] },
    { "category_id": "18020008", "group": "place", "hierarchy": ["Service", "Financial", "Credit Reporting"] },
    { "category_id": "18020009", "group": "place", "hierarchy": ["Service", "Financial", "Collections"] },
    { "category_id": "18020010", "group": "place", "hierarchy": ["Service", "Financial", "Check Cashing"] },
    { "category_id": "18020011", "group": "place", "hierarchy": ["Service", "Financial", "Business Brokers and Franchises"] },
    { "category_id": "18020012", "group": "place", "hierarchy": ["Service", "Financial", "Banking and Finance"] },
    { "category_id": "18020013", "group": "place", "hierarchy": ["Service", "Financial", "ATMs"] },
    { "category_id": "18020014", "group": "place", "hierarchy": ["Service", "Financial", "Accounting and Bookkeeping"] },
    { "category_id": "18021000", "group": "place", "hierarchy": ["Service", "Food and Beverage"] },
    { "category_id": "18021001", "group": "place", "hierarchy": ["Service", "Food and Beverage", "Distribution"] },
    { "category_id": "18021002", "group": "place", "hierarchy": ["Service", "Food and Beverage", "Catering"] },
    { "category_id": "18022000", "group": "place", "hierarchy": ["Service", "Funeral Services"] },
    { "category_id": "18023000", "group": "place", "hierarchy": ["Service", "Geological"] },
    { "category_id": "18026000", "group": "place", "hierarchy": ["Service", "Human Resources"] },
    { "category_id": "18027000", "group": "place", "hierarchy": ["Service", "Immigration"] },
    { "category_id": "18028000", "group": "place", "hierarchy": ["Service", "Import and Export"] },
    { "category_id": "18029000", "group": "place", "hierarchy": ["Service", "Industrial Machinery and Vehicles"] },
    { "category_id": "18032000", "group": "place", "hierarchy": ["Service", "Leather"] },
    { "category_id": "18033000", "group": "place", "hierarchy": ["Service", "Legal"] },
    { "category_id": "18034000", "group": "place", "hierarchy": ["Service", "Logging and Sawmills"] },
    { "category_id": "18035000", "group": "place", "hierarchy": ["Service", "Machine Shops"] },
    { "category_id": "18036000", "group": "place", "hierarchy": ["Service", "Management"] },
    { "category_id": "18037000", "group": "place", "hierarchy": ["Service", "Manufacturing"] },
    { "category_id": "18037001", "group": "place", "hierarchy": ["Service", "Manufacturing", "Apparel and Fabric Products"] },
    { "category_id": "18037002", "group": "place", "hierarchy": ["Service", "Manufacturing", "Chemicals and Gasses"] },
    { "category_id": "18037003", "group": "place", "hierarchy": ["Service", "Manufacturing", "Computers and Office Machines"] },
    { "category_id": "18037004", "group": "place", "hierarchy": ["Service", "Manufacturing", "Electrical Equipment and Components"] },
    { "category_id": "18037005", "group": "place", "hierarchy": ["Service", "Manufacturing", "Food and Beverage"] },
    { "category_id": "18037006", "group": "place", "hierarchy": ["Service", "Manufacturing", "Furniture and Fixtures"] },
    { "category_id": "18037007", "group": "place", "hierarchy": ["Service", "Manufacturing", "Glass Products"] },
    { "category_id": "18037008", "group": "place", "hierarchy": ["Service", "Manufacturing", "Industrial Machinery and Equipment"] },
    { "category_id": "18037009", "group": "place", "hierarchy": ["Service", "Manufacturing", "Leather Goods"] },
    { "category_id": "18037010", "group": "place", "hierarchy": ["Service", "Manufacturing", "Metal Products"] },
    { "category_id": "18037011", "group": "place", "hierarchy": ["Service", "Manufacturing", "Nonmetallic Mineral Products"] },
    { "category_id": "18037012", "group": "place", "hierarchy": ["Service", "Manufacturing", "Paper Products"] },
    { "category_id": "18037013", "group": "place", "hierarchy": ["Service", "Manufacturing", "Petroleum"] },
    { "category_id": "18037014", "group": "place", "hierarchy": ["Service", "Manufacturing", "Plastic Products"] },
    { "category_id": "18037015", "group": "place", "hierarchy": ["Service", "Manufacturing", "Rubber Products"] },
    { "category_id": "18037016", "group": "place", "hierarchy": ["Service", "Manufacturing", "Service Instruments"] },
    { "category_id": "18037017", "group": "place", "hierarchy": ["Service", "Manufacturing", "Textiles"] },
    { "category_id": "18037018", "group": "place", "hierarchy": ["Service", "Manufacturing", "Tobacco"] },
    { "category_id": "18037019", "group": "place", "hierarchy": ["Service", "Manufacturing", "Transportation Equipment"] },
    { "category_id": "18037020", "group": "place", "hierarchy": ["Service", "Manufacturing", "Wood Products"] },
    { "category_id": "18038000", "group": "place", "hierarchy": ["Service", "Media Production"] },
    { "category_id": "18039000", "group": "place", "hierarchy": ["Service", "Metals"] },
    { "category_id": "18040000", "group": "place", "hierarchy": ["Service", "Mining"] },
    { "category_id": "18040001", "group": "place", "hierarchy": ["Service", "Mining", "Coal"] },
    { "category_id": "18040002", "group": "place", "hierarchy": ["Service", "Mining", "Metal"] },
    { "category_id": "18040003", "group": "place", "hierarchy": ["Service", "Mining", "Non-Metallic Minerals"] },
    { "category_id": "18041000", "group": "place", "hierarchy": ["Service", "News Reporting"] },
    { "category_id": "18042000", "group": "place", "hierarchy": ["Service", "Oil and Gas"] },
    { "category_id": "18043000", "group": "place", "hierarchy": ["Service", "Packaging"] },
    { "category_id": "18044000", "group": "place", "hierarchy": ["Service", "Paper"] },
    { "category_id": "18046000", "group": "place", "hierarchy": ["Service", "Petroleum"] },
    { "category_id": "18047000", "group": "place", "hierarchy": ["Service", "Photography"] },
    { "category_id": "18048000", "group": "place", "hierarchy": ["Service", "Plastics"] },
    { "category_id": "18049000", "group": "place", "hierarchy": ["Service", "Rail"] },
    { "category_id": "18050000", "group": "place", "hierarchy": ["Service", "Real Estate"] },
    { "category_id": "18050001", "group": "place", "hierarchy": ["Service", "Real Estate", "Real Estate Development and Title Companies"] },
    { "category_id": "18050002", "group": "place", "hierarchy": ["Service", "Real Estate", "Real Estate Appraiser"] },
    { "category_id": "18050003", "group": "place", "hierarchy": ["Service", "Real Estate", "Real Estate Agents"] },
    { "category_id": "18050004", "group": "place", "hierarchy": ["Service", "Real Estate", "Property Management"] },
    { "category_id": "18050005", "group": "place", "hierarchy": ["Service", "Real Estate", "Corporate Housing"] },
    { "category_id": "18050006", "group": "place", "hierarchy": ["Service", "Real Estate", "Commercial Real Estate"] },
    { "category_id": "18050007", "group": "place", "hierarchy": ["Service", "Real Estate", "Building and Land Surveyors"] },
    { "category_id": "18050008", "group": "place", "hierarchy": ["Service", "Real Estate", "Boarding Houses"] },
    { "category_id": "18050009", "group": "place", "hierarchy": ["Service", "Real Estate", "Apartments, Condos and Houses"] },
    { "category_id": "18050010", "group": "special", "hierarchy": ["Service", "Real Estate", "Rent"] },
    { "category_id": "18052000", "group": "place", "hierarchy": ["Service", "Renewable Energy"] },
    { "category_id": "18053000", "group": "place", "hierarchy": ["Service", "Repair Services"] },
    { "category_id": "18054000", "group": "place", "hierarchy": ["Service", "Research"] },
    { "category_id": "18055000", "group": "place", "hierarchy": ["Service", "Rubber"] },
    { "category_id": "18056000", "group": "place", "hierarchy": ["Service", "Scientific"] },
    { "category_id": "18058000", "group": "place", "hierarchy": ["Service", "Shipping and Freight"] },
    { "category_id": "18059000", "group": "place", "hierarchy": ["Service", "Software Development"] },
    { "category_id": "18060000", "group": "place", "hierarchy": ["Service", "Storage"] },
    { "category_id": "18062000", "group": "place", "hierarchy": ["Service", "Tailors"] },
    { "category_id": "18064000", "group": "place", "hierarchy": ["Service", "Textiles"] },
    { "category_id": "18065000", "group": "place", "hierarchy": ["Service", "Tourist Information and Services"] },
    { "category_id": "18066000", "group": "place", "hierarchy": ["Service", "Transportation"] },
    { "category_id": "18067000", "group": "place", "hierarchy": ["Service", "Travel Agents and Tour Operators"] },
    { "category_id": "18068000", "group": "special", "hierarchy": ["Service", "Utilities"] },
    { "category_id": "18071000", "group": "place", "hierarchy": ["Service", "Web Design and Development"] },
    { "category_id": "18072000", "group": "place", "hierarchy": ["Service", "Welding"] },
    { "category_id": "18073000", "group": "place", "hierarchy": ["Service", "Agriculture and Forestry"] },
    { "category_id": "18073001", "group": "place", "hierarchy": ["Service", "Agriculture and Forestry", "Crop Production"] },
    { "category_id": "18073002", "group": "place", "hierarchy": ["Service", "Agriculture and Forestry", "Forestry"] },
    { "category_id": "18073003", "group": "place", "hierarchy": ["Service", "Agriculture and Forestry", "Livestock and Animals"] },
    { "category_id": "18073004", "group": "place", "hierarchy": ["Service", "Agriculture and Forestry", "Services"] },
    { "category_id": "18074000", "group": "place", "hierarchy": ["Service", "Art and Graphic Design"] },
    { "category_id": "20000000", "group": "special", "hierarchy": ["Tax"] },
    { "category_id": "20002000", "group": "special", "hierarchy": ["Tax", "Payment"] },

  ]

  constructor(private http: HttpClient,
    public loadingService: CommonProvider, public fbService: FirebaseFunctionLocal,
    public event: Events, private storage: Storage) {
  }
  noTokenHeader() {
    return {
      headers: new HttpHeaders({
        "Content-Type": "application/json"
      })
    };
  }
  createFuturePaychecks() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}createFuturePaychecks`, this.noTokenHeader())
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            reject("data error");
          }
        }, err => {
          reject(err);
        });
    })

  }
  budgetAllocation(params) {
    let data: any = {
      "userId": firebase.auth().currentUser.uid,
      "incomeSourceId": params.incomeSourceId,
      "overrideTemplate": params.overrideTemplate,
      "paycheckId": params.paycheckId,
      "applyForAllPaycheks": params.applyForAllPaycheks,
      "budgetTemplate": params.budgetTemplate,
      "paycheckPayTimeStamp": params.paycheckPayTimeStamp,
      "overrideTemplateCategories": params.overrideTemplateCategories
    };
    // api 
    return new Promise((resolve, reject) => {

      //  this.fbService.budgetAllocation(data).then(()=>{
      //    resolve({success: true});
      //  });
      this.http
        .post(`${url}budgetAllocation`, data, this.noTokenHeader())
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            reject("data error");
          }
        }, err => {
          reject(err);
        });

    })
  }
  tokengetAccounts(token) {
    return new Promise((resolve, reject) => {
      this.http
        .post(`${url}getAccounts`, {
          access_token: token,
        }, this.noTokenHeader())
        .subscribe((res: any) => {

          let results = [];
          if (res.success && res.accounts.length > 0) {
            // results = res.accounts;
            res.accounts.forEach(element => {
              var lastfour = element.account_id.substr(element.account_id.length - 4);
              element.lastFour = lastfour;
              results.push(element);
              let ref = firebase.firestore().collection('accounts').doc(firebase.auth().currentUser.uid).collection('account').doc(element.id).set(element);

            });

            this.storage.set('accounts', results);
            resolve(results);
          }
          else {
            this.storage.set('accounts', results);
            resolve(results);
          }
          // this.storage.set("incomeSource", results);


        }, err => {
          reject(err);
        });
    })
  }
  getAccounts() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getUserAccounts?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res.accounts;
          }
          this.loadingService.setsavedAccounts(results);
          this.storage.set("accounts", results);
          this.event.publish("refresh:accounts", { time: new Date() });
          resolve(results);
        }, err => {
          reject(err)
        });
    })
  }
  getLinkTOkens() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}generatePlaidUpdateToke?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          console.log(results);
        }, err => {
          console.log(err)
        });
    })
  }
  getGoal() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getUserGoal?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res.goal;
          }
          this.loadingService.setGoals(results);
          this.storage.set("savedgoals", results);
          this.event.publish("refresh:savedgoals", { time: new Date() });
          resolve(results);
        }, err => {
          reject(err);
        });
    })

  }
  getGoalbyId(id) {
    new Promise((resolve, reject) => {
      let goalRef = firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('goals').doc(id);
      goalRef.get().then((snapShot) => {
        if (snapShot.exists) {
          let goal = Object.assign({ id: id }, snapShot.data())
          var results = [];
          this.storage.get("savedgoals").then((res) => {
            if (res) {
              let index = res.findIndex(o => o.id === id);
              if (index != -1) {
                res[index] = goal;
              }
            }
            results = res;
            this.loadingService.setGoals(results);
            this.storage.set("savedgoals", results);
            this.event.publish("refresh:savedgoals", { time: new Date() });
          })
          resolve(results);
        }
        else {
          resolve([]);
        }
      }).catch(() => reject())
    })

  }
  getIncomeSource() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getIncomeSource?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
        .subscribe((res: any) => {

          let results = [];
          if (res) {
            results = res.incomes;
          }
          this.storage.set("incomeSource", results);
          resolve(results);

        }, err => {
          reject(err);
        });
    })

  }
  getIncomeSourceById(data) {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getIncomeSourceById?userId=${firebase.auth().currentUser.uid}&id=${data}`, this.noTokenHeader())
        .subscribe((res: any) => {
          if (res) {
            this.storage.get("incomeSource").then((result) => {
              if (result.length) {
                let index = result.findIndex(o => o.id === data)
                if (index != -1) {
                  result[index] = res.incomes;
                }
                else {
                  result.push(res.incomes);
                }
                this.storage.set("incomeSource", result)
              }
              else {
                this.storage.set("incomeSource", [res.incomes])
              }
              resolve(res);
            })

          } else {
            resolve([]);
          }
        }, err => {
          reject(err);
        });
    })

  }
  addIncomeSource(data) {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders({
        "Content-Type": "application/json",
      })
      this.http.post(`${url}addIncomeSource`, data, {
        headers
      })
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);

          }
        }, err => {
          reject(err);
        });
    })
  }
  addtoExistingIncomeSource(data) {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders({
        "Content-Type": "application/json",
      })
      this.http.post(`${url}addIncomesourceToExisting`, data, {
        headers
      })
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);

          }
        }, err => {
          reject(err);
        });
    })
  }
  transaction(data) {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders({
        "Content-Type": "application/json",
      })
      this.http
        .post(`${url}transaction`, {
          "name": data.name,
          "category": data.category,
          "category_id": data.category_id,
          "amount": data.amount,
          "transactionDateTime": data.transactionDateTime,
          "assignment": data.assignment,
          "userId": firebase.auth().currentUser.uid,
          "type": data.type
        }, {
          headers
        }).subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);
          }
        }, err => {
          reject(err);
        });
    })
  }
  getTransaction() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}/getTransaction?userId=${firebase.auth().currentUser.uid}`)
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          this.storage.set("getTransaction", results);
          resolve(results);
        }, err => {
          reject(err);
        });
    })
  }
  getPlaidCategories() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getPlaidCategories?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          this.storage.set("plaidCategories", results);
          this.event.publish("added:category", { time: new Date() });
          resolve(results);
        }, err => {
          reject(err);
        });
    })

  }
  getUniqeCategories() {
    var array = []
    firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).collection('uniqueCategories').get().then(res => {
      if (res.docs.length === 0) {
        this.storage.set("uniqueCategories", []);
      }
      else {
        res.docs.forEach((element, index) => {
          var string = "";
          for (var i = 0; i < element.data().hierarchy.length; i++) {
            string = i == 0 ? element.data().hierarchy[i] : string + " " + element.data().hierarchy[i];
          }
          array.push(Object.assign({ categoryName: string }, element.data()))
          if (index === res.docs.length - 1) {
            this.storage.set("uniqueCategories", array);
          }
        });
      }
    })
  }
  accountDelete(account) {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders({
        "Content-Type": "application/json",
      })
      this.http
        .post(`${url}deleteAccounts`, {
          "accountId": account.account_id,
          "userId": firebase.auth().currentUser.uid,
          "removeOnlyAccount": account.event
        }, {
          headers
        })
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);
          }
        }, err => {
          reject();
        });
    })
  }
  getPlaidTransaction() {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getPlaidTransaction?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            res.transactions.forEach((element, index) => {
              var string;
              element.TransAmount = element.remainingAmount != undefined ? element.remainingAmount : element.amount;
              element.category = element.category ? element.category : ["miscellaneous"];
              for (var i = 0; i < element.category.length; i++) {
                string = i == 0 ? element.category[i] : string + " " + element.category[i];
              }
              element.IncomeType = element.amount < 0 ? false : true;
              element.CategoryName = string;
              element.id = element.id ? element.id : element.transaction_id;
              results.push(element)
            });
            // results = res.transactions;
          }
          this.storage.set("plaidTransaction", results);
          resolve(results);
        }, err => {
          reject(err);
        });
    })

  }
  getPlaidTransactionById(id) {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getPlaidTransactionById?userId=${firebase.auth().currentUser.uid}&id=${id}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            var string;
            res.transactions.TransAmount = res.transactions.remainingAmount != undefined ? res.transactions.remainingAmount : res.transactions.amount;
            res.transactions.category = res.transactions.category ? res.transactions.category : ["miscellaneous"];
            for (var i = 0; i < res.transactions.category.length; i++) {
              string = i == 0 ? res.transactions.category[i] : string + "-" + res.transactions.category[i];
            }
            res.transactions.IncomeType = res.transactions.amount < 0 ? false : true;
            res.transactions.CategoryName = string;
            res.transactions.id = res.transactions.id ? res.transactions.id : res.transactions.transaction_id;
            results = res.transactions;
          }
          this.storage.get('plaidTransaction')
            .then((oldStorage) => {
              let rec = [];
              if (oldStorage.length > 0) {
                rec = oldStorage;
                this.storage.remove('plaidTransaction');
                var index = rec.findIndex(x => x.id === id);
                rec[index] = res.transactions;
                this.storage.set('plaidTransaction', rec);
                resolve(results);
              }
              else {
                this.storage.set('plaidTransaction', [res.transactions]);
                resolve(results);
              }

            });

        }, err => {
          reject(err);
        });
    })
  }
  getPaychecksOfPlaidTransaction(id) {
    return new Promise((resolve, reject) => {
      this.http
        .get(`${url}getPaychecksOfPlaidTransaction?userId=${firebase.auth().currentUser.uid}&id=${id}`, this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          resolve(results);
        }, err => {
          reject(err);
        });
    })
  }
  assignPlaidTransaction(data) {

    const headers = new HttpHeaders({
      "Content-Type": "application/json",
    })
    return new Promise((resolve, reject) => {
      if (data.id) {
        this.http
          .post(`${url}assignPlaidTransaction`, {
            "userId": firebase.auth().currentUser.uid,
            "transactionId": data.id,
            "category_id": data.category_id,
            "category": data.category,
            "assignment": data.assignment,
            "type": data.type
          }
            , { headers: headers })
          .subscribe((res: any) => {
            let results = [];
            if (res) {
              results = res;
            }
            resolve(results);
          }, err => {
            reject(err);
          });
      }
      else {
        reject("Unknown Error generate, Please try again!")
      }
    })

  }
  unAssignTransaction(data) {
    return new Promise((resolve, reject) => {
      this.http
        .post(`${url}unAssignTransaction`, {
          "userId": firebase.auth().currentUser.uid,
          "transactionId": data,
        }
          , this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          resolve(results);
        }, err => {
          reject(err);
        });
    })

  }
  deletePlaidtransaction(transaction_id) {
    return new Promise((resolve, reject) => {
      this.http
        .post(`${url}deletePlaidtransaction`, {
          "userId": firebase.auth().currentUser.uid,
          "transactionId": transaction_id,
        }
          , this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          resolve(results);
        }, err => {
          reject(err);
        });
    })

  }
  addAccounts(accounts, token) {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders({
        "Content-Type": "application/json",
      })
      this.http
        .post(`${url}addAccount`, {
          "accounts": accounts,
          "uid": firebase.auth().currentUser.uid,
          "token": token
        }, {
          headers
        })
        .subscribe(res => {
          if (res) {
          } else {
          }
        }, err => {
        });
    })
  }
  saveGoals(goal) {
    return new Promise((resolve, reject) => {
      this.http.post(`${url}saveGoals`, { userId: firebase.auth().currentUser.uid, goal: goal }, this.noTokenHeader()).subscribe(res => {
        if (res) {
          resolve(res);
        } else {
          reject("data error");
        }
      }, err => {
        reject(err);
      });
    })
  }
  updateGoals(goal) {
    return new Promise((resolve, reject) => {
      this.http.post(`${url}updateGoals`, { userId: firebase.auth().currentUser.uid, goal: goal, goalId: goal.id }, this.noTokenHeader()).subscribe(res => {
        if (res) {
          resolve(res);
        } else {
          reject("data error");
        }
      }, err => {
        reject(err);
      });
    })
  }
  removeGoal(Id) {
    return new Promise((resolve, reject) => {
      this.http
        .post(`${url}removeGoals`, {
          "userId": firebase.auth().currentUser.uid,
          "goalId": Id,
        }
          , this.noTokenHeader())
        .subscribe((res: any) => {
          let results = [];
          if (res) {
            results = res;
          }
          resolve(results);
        }, err => {
          reject(err);
        });
    })

  }
  getSurplus(params) {
    return new Promise((resolve, reject) => {
      this.http.post(`${url}getSurplus`, params, this.noTokenHeader()).subscribe(res => {
        this.getIncomeSourceById(params.incomeSourceId);
        resolve(res);
      }, err => {
        reject(err);
      });
    })
  }
  refreshDataFromServer() {
    this.storage.clear();
    this.getIncomeSource();
    this.getAccounts();
    this.getTransaction();
    this.getGoal();
    this.getPlaidCategories();
    this.getUniqeCategories();
    this.getPlaidTransaction();
  }
  // ----------------------------@set @get
  setPlaidTransactionParam(item) {
    this.plaidTransaction = item;
  }
  getPlaidTransactionParam() {
    return this.plaidTransaction
  }
  updateCategory(argts) {
    return new Promise((resolve, reject) => {
      let params = {
        data: argts.transaction,
        new_category: argts.new_category,
        userId: firebase.auth().currentUser.uid
      }
      this.http.post(`${url}updateCategory`, params, this.noTokenHeader()).subscribe(res => {
        resolve(res);
      }, err => {
        reject(err);
      });
    })
  }
  changePaychecks(argts) {
    return new Promise((resolve, reject) => {
      let params = {
        old_paycheck: argts.old_paycheck,
        new_paycheck: argts.new_paycheck,
        transaction: argts.transaction,
        userId: firebase.auth().currentUser.uid
      }
      this.http.post(`${url}changePaychecks`, params, this.noTokenHeader()).subscribe(res => {
        resolve(res);
      }, err => {
        reject(err);
      });
    })
  }
  fetchMissingPlaidInfo(lastConnectionDate) {
    return new Promise((resolve, reject) => {
      this.http.post(`${url}fetchMissingPlaidInfo`, {
        lastconnectionDate: lastConnectionDate,
        userId: firebase.auth().currentUser.uid
      }, this.noTokenHeader()).subscribe(res => {
        this.refreshDataFromServer();
        resolve(res);
      }, err => {
        reject(err);
      });
    })
  }
  createStripecustomer(obj) {
    return new Promise((resolve, reject) => {
      let httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + obj.token
        })
      }
      this.http
        .post(`${url}createCustomer`, {
          "cusEmail": obj.email,
          "cusName": obj.name,
          "description": obj.description,
          "userId": firebase.auth().currentUser.uid,
          "sourceToken": obj.sourceToken,
          "priceId": obj.priceId
        },
          httpOptions
        )
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);
          }
        }, err => {

          reject();
        });
    })
  }
  getProducts() {
    return new Promise((resolve, reject) => {
      // let httpOptions = {
      //   headers: new HttpHeaders({
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer ' + obj.token
      //   })
      // }
      this.http
        .get(`${url}getAllProduct`
        )
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);
          }
        }, err => {
          reject();
        });
    })
  }
  cancelStripecustomer(obj) {
    return new Promise((resolve, reject) => {
      let httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + obj.token
        })
      }
      this.http
        .post(`${url}cancelSubscription`, {
          "userId": firebase.auth().currentUser.uid,
          "subscriptionId": obj.subscriptionId,
        },
          httpOptions
        )
        .subscribe(res => {
          if (res) {
            resolve(res);
          } else {
            resolve([]);
          }
        }, err => {
          reject();
        });
    })
  }
  // for new paycheck generate 
  // getNewPaycheck() {
  //   return new Promise((resolve, reject) => {
  //     this.http
  //       .get(`${url}generatenewPaychecks?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
  //       .subscribe((res: any) => {
  //         if (res.success) {
  //           this.http
  //             .get(`${url}dailyTemplateCustom?userId=${firebase.auth().currentUser.uid}`, this.noTokenHeader())
  //             .subscribe((res1: any) => {
  //               if (res1.success) {
  //                 resolve({})
  //               }
  //             }, err => {
  //               reject(err)
  //             })
  //         }
  //         else {
  //           reject()
  //         }
  //       }, err => {
  //         reject(err)
  //       });
  //   })
  // }
  editAllocatedBudget(params) {
    let queryParams = Object.assign({
      uid: firebase.auth().currentUser.uid
    }, params);
    return new Promise((resolve, reject) => {
      this.http
        .post(`${url}changeBudgetedAmount`, queryParams, this.noTokenHeader())
        .subscribe((res: any) => {
          if (res.success) {
            resolve({ success: true })
          }
        }, err => {
          reject(err)
        })
    })
  }
  // budgetCustomAPi(date) {
  //   return new Promise((resolve, reject) => {
  //     this.http
  //       .get(`${url}dailyTemplateCustom?userId=${firebase.auth().currentUser.uid}&date=${date}`, this.noTokenHeader())
  //       .subscribe((res1: any) => {
  //         if (res1.success) {
  //           resolve({})
  //         }
  //       }, err => {
  //         reject(err)
  //       })
  //   })
  // }

  // validate stripe coupon 
  isValidateStripe(couponId, authToken) {
    return new Promise((resolve, reject) => {
      //console.log(couponId);
      let httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authToken
        })
      }
      this.http
        .get(`${url}validateCoupon?coupon=${couponId}`, httpOptions)
        .subscribe((result: any) => {
          if (result.success) {
            resolve({})
            //console.log(couponId);
          }
        }, err => {
          reject(err)
        })
    })
  }
}