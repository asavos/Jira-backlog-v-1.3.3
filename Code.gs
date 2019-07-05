//this is default data - it will be overwritten by data from modal form
var config = {
  domain: "jira.nrp.net.ua",
  dateStart: "2018-07-01",
  dateEnd: "2019-10-10",
  project: "DMS",
  username: PropertiesService.getScriptProperties().getProperty('username'),
  password: PropertiesService.getScriptProperties().getProperty('userpassword'),
  maxResults: 1000
}

var count = 0;

var state = {};
state.data = null;
var SIGNATURE = [["Issue", "Summary", "Create date", "Author", "Comment", "Time spend in Hours"]];

function init(){
  var app = SpreadsheetApp;
  var ss = app.getActiveSpreadsheet();
  var ass = ss.getActiveSheet();
  
  loadWorklogData();
  var transformedData = transformWorklogToSSData(state.data);
  transformedData.unshift(SIGNATURE);
  //Logger.log(transformedData);
  appendDataToSS(ass, transformedData);
}

function transformWorklogToSSData(){
  var result = [];
  for(var issueIdx = 0; issueIdx < state.worklog.length; issueIdx++) {
    var issue = state.worklog[issueIdx];
    
    for(var entryIdx = 0; entryIdx < issue.entries.length; entryIdx++) {
      var entry = issue.entries[entryIdx];
      
      result.push([
        issue.key, // issue
        issue.summary,
        convertDateToSSDate(new Date(entry.created)), // worklog created
        entry.authorFullName, // author
        entry.comment,
        secondsToHours(entry.timeSpent), // time spend in hours
      ]);
    }
  }
  return [result];
}   

function appendDataToSS( ass, arr ){
  arr.forEach(function(item){
    ass.getRange(ass.getLastRow()+1, 1, item.length, item[0].length).setValues(item);
  });
}

// When spreadsheet opens, this sets up the custom Jira and Story Cards menus, and the functions that they call when selected:
function onOpen(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuItems = [
    {name: 'Set Credentials', functionName: 'showAuthDialog'},
    {name: 'Create worklogs report', functionName: 'showDialog'}
  ];
  ss.addMenu('Jira', menuItems);
 }
    
function showAuthDialog() {
  Logger.log('Show auth dialog');
  var ui = HtmlService.createTemplateFromFile('DialogAuth')
      .evaluate()
      .setWidth(400)
      .setHeight(400)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(ui, "Set Credentials");
}
    
function showDialog() {
  Logger.log('Show dialog');
  var ui = HtmlService.createTemplateFromFile('Dialog')
      .evaluate()
      .setWidth(400)
      .setHeight(400)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModalDialog(ui, "Create worklogs report");
}
    
//prepareSheed return data from dialog
function prepareSheet(data) {
  SpreadsheetApp.getActiveSheet().clear();
  setConfig(data);
  Logger.log( "CONFIG IS" );
  Logger.log( config );
  init();
}
    
function setCredentials(data) {
  config.username = PropertiesService.getScriptProperties().setProperty('username', data.username);
  config.password = PropertiesService.getScriptProperties().setProperty('userpassword', data.password);
}

function setConfig(data) {
  config.project = data.project;
  config.dateStart = data.dateStart;
  config.dateEnd = data.dateEnd;
}

function loadWorklogData() {
  var projectId = getProjectId();
  var url = "https://jira.nrp.net.ua/rest/timesheet-gadget/1.0/raw-timesheet.json?" +
    "selectedProjectId=" + projectId +
    "&startDate=" + config.dateStart +
    "&endDate=" + config.dateEnd + 
    "&targetUser=&projectRoleId=&projectid=" + projectId +
    "&filterid=&priority=&commentfirstword=&sum=&groupByField=&sortBy=&sortDir=ASC&Next=Next";
  state.worklog = requestJiraJson(url).worklog;
}
  
   
function getProjectId() {
  var url = "https://jira.nrp.net.ua/rest/api/2/search?jql=project%20%3D%20" + config.project + "&maxResults=1&fields=project";
  return requestJiraJson(url).issues[0].fields.project.id;
}

function requestJiraJson(url) {
  var parameters = {
    method : "get",
    accept : "application/json",
    headers: {"Authorization" : "Basic " + Utilities.base64Encode( config.username + ":" + config.password )}
  };
  var responseText = UrlFetchApp.fetch(url, parameters).getContentText();
  return JSON.parse(responseText);
}

function convertDateToSSDate(date) {
  return date.getFullYear() + "-" + ( parseInt(date.getMonth() ) + 1 ) + "-" + date.getDate();
}

function secondsToHours(seconds) {
  return seconds / 60 / 60;
}

// OLD CODE:

//function getDataFromJiraApi() {
//  var parameters = {
//      method : "get",
//      accept : "application/json",
//      headers: {"Authorization" : "Basic " + Utilities.base64Encode( config.username + ":" + config.password )}
//   };
//   
//  //var jira_url = "https://" + config.domain + "/rest/api/2/search?jql=" + encodeURIComponent(getQuery()) ;
//  
//    var jira_url = "https://jira.nrp.net.ua/rest/api/2/search"
//                   + "?fields=worklog&jql=project%20%3D%20"
//                   + config.project
//                   + "%20and%20worklogDate%20%3E%20%27"
//                   + config.dateStart
//                   + "%27%20and%20worklogDate%20%3C%20"
//                   + config.dateEnd
//                   + "&" + "maxResults" + "=" + config.maxResults;
//  var text = UrlFetchApp.fetch(jira_url, parameters).getContentText();
//  state.data = JSON.parse(text).issues;
//}

//function transformData(issuesArr){
//  var configDateStart = new Date(config.dateStart);
//  var configDateEnd = new Date(config.dateEnd);
//  
//  var mapped = [];
//  for (var issueIndx = 0; issueIndx < issuesArr.length; issueIndx++) {
//    var issue = issuesArr[issueIndx];
//    var mappedIssue = issueToWorklogRows(issue, configDateStart, configDateEnd);
//    
//    if (mappedIssue.length > 0) {
//      mapped.push(mappedIssue);
//    }
//  }
//  return mapped;
//}
//
//function issueToWorklogRows(issue, configDateStart, configDateEnd) {
//  var worklogs = issue.worklogs;
//  var result = [];
//
//  for (var worklogIndx = 0; worklogIndx < issue.fields.worklog.worklogs.length; worklogIndx++) {
//    var worklog = issue.fields.worklog.worklogs[worklogIndx];
//    var worklogCreateDate = new Date( worklog.created );
//    
//    if (worklogCreateDate > configDateEnd || worklogCreateDate < configDateStart) {
//      continue; 
//    }
//    
//    result.push(worklogToRow(issue, worklog, worklogCreateDate));
//  }
//  
//  return result;
//}
//                       
//function worklogToRow(issue, worklog, worklogCreateDate) {
//  var dateResult = worklogCreateDate.getFullYear() + "-" + ( parseInt(worklogCreateDate.getMonth() ) + 1 ) + "-" + worklogCreateDate.getDate();
//  var tempArr = [];
//  tempArr.push(issue.key);
//  tempArr.push(dateResult);
//  tempArr.push(worklog.author.displayName);
//  tempArr.push(worklog.comment);
//  tempArr.push( parseInt( worklog.timeSpentSeconds ) / 3600);
//  return tempArr;
//}