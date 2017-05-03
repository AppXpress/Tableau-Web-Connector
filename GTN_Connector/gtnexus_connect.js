/**
 * Created by areynolds2 on 4/12/2017.
 */
(function () {
    var myConnector = tableau.makeConnector();
    var gtn = {
        datakey : '8c4cd01ae9dccd7be17f8942623a42c548f6f7f2',
        env : 'https://network-rctq.qa.gtnexus.com',
        localhost_server : 'http://localhost:8889'
    };

    var connectionDataObject = {
        schema : [],
        questionId : null
    };
    var tempStore = {};

    myConnector.init = function(cb){
        var accessToken = Cookies.get("accessToken");
        console.log("Access token is '" + accessToken + "'");
        var hasAuth = (accessToken && accessToken.length > 0) || tableau.password.length > 0;
        $('#text').text('Token = ' + accessToken + '/' + hasAuth );

        if( hasAuth ){
            toggleElements( $('#queryForm') , $('#authenticationForm') );
        }
        cb();
    };

    if (tableau.phase == tableau.phaseEnum.gatherDataPhase) {
        // If API that WDC is using has an enpoint that checks
        // the validity of an access token, that could be used here.
        // Then the WDC can call tableau.abortForAuth if that access token
        // is invalid.
        //tableau.abortForAuth('Err nah');
    }
    myConnector.getSchema = function(schemaCallback){
        var connectionData = JSON.parse( tableau.connectionData );
        //var cols = connectionData.schema;

        var cols = [
            { id : 'text' , alias : 'Answer Text' , dataType : tableau.dataTypeEnum.string },
            { id : 'selected' , alias : 'Selected' , dataType : tableau.dataTypeEnum.bool },
            { id : 'createDate', alias : 'Created Date' , dataType : tableau.dataTypeEnum.date }
        ];

        var table = {
            id : "questionInstances",
            alias : "Question Responses ",
            columns : cols
        };



        schemaCallback([table]);
    }

    myConnector.getData = function (table, doneCallback) {
        var url = gtn.env ;
        var questionDesignId = JSON.parse( tableau.connectionData ).questionId;
        if(table.tableInfo.id == 'tradingPartnerProfile'){
            table.appendRows([]);
            doneCallback();
        } else{
            url += "/rest/310/$QuestionInstanceS1/query?oql=questionDesignId='" + questionDesignId + "'&";
            gatherAllData( url ).then(function(data){
                var tableData = [];
                tableau.log('Call me back' + data.length );
                for( var i = 0 , len = data.length ; i < len ; i++ ){
                    var question = data[i];
                    if(question.responses && question.responses.length ){
                        var responses = question.responses;
                        var resLen = responses.length,
                            j = 0,
                            rowData = {},
                            colKey = null;
                        for(j; j < resLen; j++){
                            tableData.push({
                                selected : responses[j].selected == 'true' ,
                                text : responses[j].answerText,
                                createDate : question.createdDate
                            });
                        }

                    }
                }
                table.appendRows(tableData);
                doneCallback();
            } , function(err){
                tableau.log(err);
                alert('Did not work');
                    doneCallback();

            })
        }
    };

    tableau.registerConnector(myConnector);

    $(document).ready(function () {

        $("#tableauSubmit").click(function () {
            tableau.connectionName = "GT Nexus REST API Connector";
            var question = $('#question');
            tableau.log( 'Question val ' + question.val() );
            if( question.val() != 'false'){
                tableau.connectionData = getConnectionData( question );
                tableau.submit();
            } else{
                alert('Need to select a Question');
            }
        });

        $('#queryForQuestions').click(function(){
            var $btn = $(this).button('loading');
            var questionForm = $('#selectQuestionDesignForm').hide();
            var url = formQuestionsQuery();
            gatherAllData( url ).then(function(res){
                console.log('SUCCESS');
                console.log(res);
                addQuestionsToDropdown(res);
                $btn.button('reset');
                questionForm.show();
            }, function(err){
                console.log('ERROR');
                console.log(err);
            });
        });

        $('#authButton').click(function(){
            $(this).button('loading');
            $('#authErroMsg').empty();
            $.getJSON( gtn.localhost_server + '/authenticate/310' , {
                url : gtn.env + '/rest/310/',
                username : $('#username').val(),
                password : $('#password').val()
            } , function(res){
                if( res.auth ){
                    $('#text').text('succ');
                    Cookies.set('accessToken' , res.auth );
                    toggleElements( $('#queryForm') , $('#authenticationForm') );
                } else{
                    $('#authErrorMsg').text('Authentication failed');
                }
                $(this).button('reset');
            });
        });
    });

    function getConnectionData( question ){
        //get question
        var questionId = question.val();
        var iter = question.find("option[value='" + questionId + "']").attr('i');

        var question = tempStore.questions[iter];
        var schema = [];
        var answers = question.answerList;
        if( answers ){
            var len = answers.length,
                i = 0,
                id;
            for(i; i < len; i++){
                id = 'opt' + i;
                schema.push( { id : id , alias : answers[i].answerText , dataType : tableau.dataTypeEnum.bool } );
            }
        }
        connectionDataObject.questionId = questionId;
        connectionDataObject.schema = schema;
        return JSON.stringify( connectionDataObject );
    }

    function formQuestionsQuery(){
        var url = gtn.env + "/rest/310/$QuestionDesignS1/query?oql=";
        //add static
        url += "status='ACTIVE' AND answerTypeValues IN ('multiSelectPicklist','singleSelectPickList') ";
        var category = $('#category').val();
        if(category){
            url += "AND category1Value = '" + category + "'";
        }
        var qId = $('#qUID').val();
        if(qId){
            url += "AND questionId CONTAINS '" + qId + "'";
        }
        console.log('URL ' + url );
        url += "&";

        return url;
    }

    function addQuestionsToDropdown(res){
        var i = 0,
            len = res.length,
            opt = null;
        tempStore.questions = res;
        var questionSelect = $('#question');
        for(i; i < len; i++){
            if(res[i]){
                opt = $('<option value="' + res[i].uid + '" i="' + i + '">' + res[i].questionText + '</option>');
                questionSelect.append( opt );
            }
        }
    }

    function toggleElements( elOn , elOff ){
        elOn.show();
        elOff.hide();
    }


    var maxData = 10000;
    function gatherAllData( url ){
        var dataRows = [] ,
            offset = 0;
        return new Promise( function(resolve, reject ){
            sendRequest( url , dataRows , offset ).then(function( data ){
                tableau.log('GATHER ALL DATA RESOLVED');
                resolve(data);
            } , function(err){
                reject(err);
            })
        });
    }

    var QUERY_LIMIT = 100;
    function sendRequest(url , data , offset){
        tableau.log('Sending request' + offset );
        return new Promise( function(resolve,reject){
            $.getJSON(gtn.localhost_server + '/gtn-suppq-rest/310' , {
                auth : Cookies.get('accessToken'),
                url : url + 'offset=' + offset + "&limit=" + QUERY_LIMIT,
                datakey : gtn.datakey
            }).then(function(res){
                if( res.result ){
                    data = data.concat( res.result );
                }
                tableau.log( data );
                if( res.resultInfo.hasMore ){
                    offset += QUERY_LIMIT;
                    sendRequest( url , data , offset ).then(function(data){
                        resolve(data);
                    }, function(err){
                        reject(err);
                    });
                } else{
                    tableau.log('RESOLVED');
                    resolve(data);
                }
            }, function(err){
                tableau.log(err);
                if(err.status == 401){
                    Cookies.set('accessToken' , undefined);
                    tableau.abortForAuth('Need to reauthenticate');
                }
                reject();
            })
        });
    }
})();