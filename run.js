var stopping = false;
var intervals = [];
var defaultAPI = "https://script.google.com/macros/s/AKfycbxxBGeUvhZ7oL-vVhjX8SKM9cbm1TzK0lXOZiBwQdWl2lLP_48/exec";
var defaultAPIKEY = "f935a4a30327ffa326dff3f2058c8f70373b3610";
var savedDetails = {};
var email = "";

function start() {
	stopping = false;
	$('#extractor-start-button').text('Stop');
	startVisiting(0);
}

function stop() {
	stopping = true;
	$('#extractor-start-button').text('Start');

	for(var i = 0; i < intervals.length; i++) {
		clearInterval(intervals[i]);
	}
}

function startVisiting(i) {
		if(stopping) {
			stop();
			return;
		}
		var visited1 = parseInt($('#extractor-visited').text());
		if(savedDetails.COUNT!="" && parseInt(savedDetails.COUNT)>0 && visited1 >= savedDetails.COUNT)
		{
			stop();
			return;
		}
		var peopleRows = $('#results .people');
		var personRow = peopleRows[i];

		var personTitle = $(personRow).find('a.title');

		if(personRow && personTitle) {
			var nowText = $(personTitle).text();
			var personLink = $(personTitle).attr('href');

			i++;

			//dont visit again if already visited
			if(!personLink || nowText.indexOf('LinkedIn Member') > -1 || nowText.indexOf('(Next To Visit)') > -1 || nowText.indexOf('(Visited)') > -1 || nowText.indexOf('(Skipped)') > -1) {
				startVisiting(i);

				if(nowText.indexOf('(Skipped)') === -1) {
					nowText = nowText.replace(' (Visited)', '').replace(' (Next To Visit)', '');
					$(personTitle).text(nowText + ' (Skipped)');
				}
				return;
			}


			nowText += " (Next To Visit)";
			$(personTitle).text(nowText);

			var delay = Math.round(Math.random() * (23000 - 10000)) + 10000;
			var delayS = Math.round(delay/1000);

			$('#extractor-next-visit').text(delayS + 's');

			var interval = setInterval(function() {
				delayS--;

				$('#extractor-next-visit').text(delayS + 's');

				if(delayS <= 0) {

					var intervalIndex = intervals.indexOf(interval);
					if(intervalIndex > -1)
					{
						clearInterval(intervals[intervalIndex]);
						intervals.splice(intervalIndex, 1);
					}

					visitPerson(personLink, function(profileDetails) {
						saveOrPrint(profileDetails);

						var visited = parseInt($('#extractor-visited').text());
						visited++;
						$('#extractor-visited').text(visited);

						if(nowText.indexOf('(Visited)') === -1) {
							nowText = nowText.replace('(Next To Visit)', '(Visited)');
							$(personTitle).text(nowText);
						}
						startVisiting(i);
						return;
					});
				}
			}, 1000 );

			intervals.push(interval);

		} else {
			var next = $('a.page-link[rel="next"]');

			if(next) {
				$('a.page-link[rel="next"]')[0].click();

				setTimeout(function() {
					startVisiting(0);
				}, 4000);
			} else {
				stop();
			}
		}
}

function visitPerson(link, completed) {
	$.ajax({
		url: link,
		type: 'post',
		headers: {
			'contentType': 'application/x-www-form-urlencoded'
		},
		timeout: 10000
	}).done(function(data) {
		var html = $.parseHTML(data);

		var name = $($(html).find('.full-name')).text();
		var headline = $($(html).find('#headline')).text();
		var locality = $($(html).find('#top-card .locality')).text();
		var industry = $($(html).find('#top-card .industry')).text();
		var twitter = $($(html).find('#twitter-view a')).text();
//		var website = $($(html).find('#website-view a href'))text();
		var currentCompanies = $($(html).find('#overview-summary-current ol')).text();
        if (!currentCompanies) {
        currentCompanies=$($(html).find('#background-experience a[href*="/company/"]:first')).text(); }

		var previousCompanies = $($(html).find('#overview-summary-past ol')).text();
		var lastCompany = $($(html).find('#overview-summary-current a[href*="/company/"]:first'));


		var firstName = name.split(' ').slice(0, -1).join(' ');
		var lastName = name.split(' ').slice(-1).join(' ');


		var lastCompanyLink = '';
		if(lastCompany && lastCompany.attr('href')) {
			lastCompanyLink = 'https://www.linkedin.com' + lastCompany.attr('href');
		}

		var education = $($(html).find('#overview-summary-education ol')).text();

		var connections = $($(html).find('.member-connections > strong')).text();
		var skills = $($(html).find('#profile-skills .endorse-item-name-text')).map(function() {
			return $(this).text();
		}).get().join(', ');

		var mailId = fetchMail(data);
		email = mailId.join('; ');
    var email1 = "";
		var phoneNumber = fetchPhone(data);
		var phone = phoneNumber.join(', ');

		var interests = $($(html).find('#interests-view li')).text();

		var link = $($(html).find('#top-card .view-public-profile')).text();
		var companyWebsite = '';
		var industry = "";
		var companyType = "";
		var headQuaters = "";
		var companySize = "";
		var companyFounded = "";

		var profileDetails = {
			name: name,
			firstName: firstName,
			lastName: lastName,
			email: email,
			email1: email1,
			phone: phone,
			headline: headline,
			locality: locality,
			industry: industry,
			currentCompanies: currentCompanies,
			previousCompanies: previousCompanies,
			currentCompanyProfile: lastCompanyLink,
			education: education,
			connections: connections,
			skills: skills,
			interests: interests,
			link: link,
			companyWebsite: companyWebsite,
			industry: industry,
			companyType: companyType,
			headQuaters: headQuaters,
			companySize: companySize,
			companyFounded: companyFounded,
			twitter: twitter
		};

try{
	//alert("0");
		if(!lastCompanyLink) {
			completed(profileDetails);
			return;
		} else {
			try{
			$.ajax({
				url : lastCompanyLink,
				type: 'get',
				timeout: 10000
			}).done(function(data) {
				var htmlAgain = $.parseHTML(data);
				var code = $($(htmlAgain).find('#stream-about-section-embed-id-content')).html() || '{}';
				var str = code.replace("<!--", "").replace("-->", "");

				try{
				var companyWebsite = JSON.parse(str).website;
				if(companyWebsite)
					profileDetails.companyWebsite = companyWebsite;
					if(!email1)
					{
						var domain = companyWebsite.replace("https://","").replace("http://","").replace("www.","");
						      }

						var APIKEY = savedDetails.APIKEY;

									if(APIKEY)
									{
										$.getJSON( "https://api.emailhunter.co/v1/generate", { domain: domain, first_name: firstName, last_name: lastName, api_key: APIKEY} )
									 .done(function( json ) {
										 var status = json.status;
										 var getEmail = json.email;
										 var score = json.score;
										 if(status == "success")
										 {
											 if(parseInt(score) >= 1)
											 {
																		 $.getJSON( "https://api.emailhunter.co/v1/verify", { email: getEmail, api_key: APIKEY} )
																		 .done(function( jsn ) {

																			 var statusjn = jsn.status;
																			 var result = jsn.result;
																			 var scorejn = jsn.score;
																			 if( statusjn == "success" && result != "undeliverable" && parseInt(scorejn)  >= 1)
																			 {
																				 profileDetails.email1 = getEmail;

																			 }
																			 else {
																							console.log("noo email from api");
																			 }
																		 })
																		 .fail(function( jqxhr, textStatus1, error1 ) {
																			 var err1 = textStatus1 + ", " + error1;
																			 console.log( "Request Failed: " + err1 );
																	 });


											 }
										 }


									 })
									 .fail(function( jqxhr, textStatus, error ) {
										 var err = textStatus + ", " + error;
										 console.log( "Request Failed: " + err );
								 });
								 }
								 else {
													 $.getJSON( "https://api.emailhunter.co/v1/generate", { domain: domain, first_name: firstName, last_name: lastName, api_key: defaultAPIKEY} )
				 									.done(function( json ) {
				 										var status = json.status;
														var getEmail = json.email;
														var score = json.score;
														if(status == "success")
														{
															if(parseInt(score) >= 1)
															{
																						$.getJSON( "https://api.emailhunter.co/v1/verify", { email: getEmail, api_key: defaultAPIKEY} )
																						.done(function( jsn ) {

																							var statusjn = jsn.status;
																							var result = jsn.result;
																							var scorejn = jsn.score;
																							if( statusjn == "success" && result != "undeliverable" && parseInt(scorejn)  >= 1)
																							{

																								profileDetails.email1 = getEmail;


																							}
																							else {
																								console.log("noo email from api");
			 																			 }
																						})
																						.fail(function( jqxhr, textStatus1, error1 ) {
																							var err1 = textStatus1 + ", " + error1;
																							console.log( "Request Failed: " + err1 );
																					});

															}



														}


				 									})
				 									.fail(function( jqxhr, textStatus, error ) {
				 										var err = textStatus + ", " + error;
				 										console.log( "Request Failed: " + err );
				 								});
								 }
					}

				catch(e)
				{
						console.log(e.message);
				}

				try{
				var code1 = $($(htmlAgain).find('#stream-insights-embed-id-content')).html() || '{}';
				var str1 = code1.replace("<!--", "").replace("-->", "");
				}
				catch(e)
				{
						console.log(e.message);
				}

				try{
				companySize = JSON.parse(str1).size;
				if(companySize)
					profileDetails.companySize = companySize;
				}
				catch(e)
				{
						console.log(e.message);
				}

				try{
					if(currentCompanies == "")
						{
								currentCompanies = JSON.parse(str1).companyName;
								if(companySize)
									profileDetails.currentCompanies = currentCompanies;
						}
				}
				catch(e)
				{
						console.log(e.message);
				}


				try{
				industry = JSON.parse(str1).industry;
				if(industry)
					profileDetails.industry = industry;
				}
				catch(e)
				{
						console.log(e.message);
				}

				try{
				companyType = JSON.parse(str1).companyType;
				if(companyType)
					profileDetails.companyType = companyType;
				}
				catch(e)
				{
						console.log(e.message);
				}

				try{
				companyFounded = JSON.parse(str1).yearFounded;
				if(companyFounded)
					profileDetails.companyFounded = companyFounded;
				}
				catch(e)
				{
						console.log(e.message);
				}

				try{
				var head = JSON.parse(str1).headquarters;
					if(head)
					{
							headQuaters = $.param(head).replace("&", ", ").replace("&", ", ").replace("&", ", ").replace("&", ", ").replace("&", ", ").replace("&", ", ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ").replace("+", " ");
					}
					if(headQuaters)
						profileDetails.headQuaters = headQuaters;
				}
				catch(e)
				{
						console.log(e.message);
				}


			});
		 }

			finally
			{


			}
}
	}
	finally{


		setTimeout(function(){

			console.log(profileDetails);
			completed(profileDetails);
			return;
	 }, 5000);

	}
	});
}


function saveOrPrint(details) {
	try{
				var API = savedDetails.API;
				var detail = jQuery.param( details );
				if(API) {
					try {
						$.ajax({
							url: API,
							type: 'POST',
							dataType : 'html',
							data: detail
						}).complete(function(returned) {

						});
					} catch(e) {}

				}
				else{
					try {
						$.ajax({
							url: defaultAPI,
							type: 'POST',
							data: detail
						}).complete(function(returned) {

						});
					} catch(e) {
						console.log(e.message);
					}
				}
		}
		catch(err)
		{
			console.log(err.message);
		}
}

function initialize(complete) {
	chrome.runtime.sendMessage({'message' : 'load'}, function(returnedDetails) {
		if(returnedDetails)
			savedDetails = returnedDetails;

		var API = savedDetails.API || '';
		var COUNT = savedDetails.COUNT || '';
		var APIKEY = savedDetails.APIKEY || '';
		$.get(chrome.extension.getURL("toolbar.html"), function(toolbarHTML) {
			$('#srp_main_').append(toolbarHTML);

			if(API)
			{
				$('#extractor-save-to').val(API);
			}

			if(APIKEY)
			{
				$('#extractor-email').val(APIKEY);
			}

			if(COUNT)
			{
				$('#extractor-crawl-count').val(COUNT);
			}

			complete();
		});
	});

}

$(function() {
	$('#srp_main_').on('click', '#extractor-start-button', function() {
		var text = $(this).text();

		if(text === 'Start') {
			start();
		} else {
			stop();
		}
	});

	$('#srp_main_').on('click', '#extractor-change-save', function() {
		var text = $(this).text();
		var self = this;

		var API = $('#extractor-save-to').val();

		if(API) {
			savedDetails.API = API;
			chrome.runtime.sendMessage({'message' : 'save', 'toSaveDetails' : savedDetails}, function() {});
			$(this).text("Saved!").attr('disabled', true);
		} else
			{
				$(this).text("Invalid API Endpoint").attr('disabled', true);
			}


		setTimeout(function() {
			$(self).text(text).attr('disabled', false);
		}, 2000);
	});

	$('#srp_main_').on('click', '#extractor-change-count', function() {

		var text = $(this).text();

		var self = this;

		var COUNT = $('#extractor-crawl-count').val();

		if(COUNT) {
			savedDetails.COUNT = COUNT;
			chrome.runtime.sendMessage({'message' : 'save', 'toSaveDetails' : savedDetails}, function() {});
			$(this).text("Saved!").attr('disabled', true);
		} else
			{
				$(this).text("Invalid Number").attr('disabled', true);
			}


		setTimeout(function() {
			$(self).text(text).attr('disabled', false);
		}, 2000);
	});

	$('#srp_main_').on('click', '#extractor-email-save', function() {

		var text = $(this).text();

		var self = this;

		var APIKEY = $('#extractor-email').val();


		if(APIKEY) {
			savedDetails.APIKEY = APIKEY;
			chrome.runtime.sendMessage({'message' : 'save', 'toSaveDetails' : savedDetails}, function() {});
			$(this).text("Saved!").attr('disabled', true);
		} else
			{
				$(this).text("Invalid API key").attr('disabled', true);
			}


		setTimeout(function() {
			$(self).text(text).attr('disabled', false);
		}, 2000);
	});



	initialize(function() {});
});



function fetchMail(html) {
	var getChunk = html;

	function extractEmails(chunk) {
	    return chunk.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}\b/ig);
	}

	function unique(list) {
		var result = [];
		$.each(list, function(i, e) {
			if ($.inArray(e, result) == -1) result.push(e);
		});
		return result;
	}

	function objectToString(object) {
		var stringify = "";
		for (var property in object) {
			stringify += object[property] + '<br>';
		}
		return stringify;
	}

		return unique(extractEmails(getChunk));;
}







function fetchPhone(html) {
	var getChunk = html;

	function extractPhone(chunk) {
		//return chunk.match(/\b[+]{0,1}[0-9]{0,3}[.\- ]{0,1}[(]{0,1}[0-9]{3,3}[)]{0,1}[.\- ]{0,1}[0-9]{3,3}[.\- ]{0,1}[0-9]{4,4}\b/ig);
	    return chunk.match(/\b[+]{0,1}[0-9]{0,3}[.\- ]{0,1}[(]{0,1}[0-9]{3,3}[)]{0,1}[.\- ]{1,1}[0-9]{3,3}[.\- ]{0,1}[0-9]{4,4}\b/ig);
	}

	function uniquePhone(list) {
		var result = [];
		$.each(list, function(i, e) {
			if ($.inArray(e, result) == -1) result.push(e);
		});
		return result;
	}

	function objectToString(object) {
		var stringify = "";
		for (var property in object) {
			stringify += object[property] + '<br>';
		}
		return stringify;
	}

		return uniquePhone(extractPhone(getChunk));
	}
