/*  main.js
    Hearthstone Collection Tracker
*/
var HSCollectionTracker = (function() {
	/*********************************************************
	***************************DATA***************************
	*********************************************************/
	var classesEnum = {
		neutral: "neutral",
		druid: "druid",
		hunter: "hunter",
		mage: "mage",
		paladin: "paladin",
		priest: "priest",
		rogue: "rogue",
		shaman: "shaman",
		warlock: "warlock",
		warrior: "warrior"
	};
	
	var raritiesEnum = {
		free: "free",
		common: "common",
		rare: "rare",
		epic: "epic",
		legendary: "legendary"
	};
	
	var setsEnum = {
		basic: "basic",
		classic: "classic",
		reward: "reward",
		promo: "promo",
		naxxramas: "naxxramas",
		gvg: "gvg",
		blackrock: "blackrock",
		tgt: "tgt",
		loe: "loe"
	};
	
	// The number of cards and craftable cards in each set.
	// Created dynamically when visiting progress page/pack guide
	var setsCards;
	
	// Lists which card qualities are uncraftable for each set
	var setsUncraftable = {
		basic: "both",
		classic: "none",
		reward: "both",
		promo: "golden",
		naxxramas: "normal",
		gvg: "none",
		blackrock: "normal",
		tgt: "none",
		loe: "normal"
	};
	
	var packsEnum = {
		classic: "classic",
		gvg: "gvg",
		tgt: "tgt"
	};
	
	var craftingCost = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 40, golden: 400 },
		rare:      { normal: 100, golden: 800 },
		epic:      { normal: 400, golden: 1600 },
		legendary: { normal: 1600, golden: 3200 }
	};
	
	var disenchantmentValue = {
		free:      { normal: 0, golden: 0 },
		common:    { normal: 5, golden: 50 },
		rare:      { normal: 20, golden: 100 },
		epic:      { normal: 100, golden: 400 },
		legendary: { normal: 400, golden: 1600 }
	};
	
	// Chance of getting a card of a specific quality when opening packs.
	// For each card, not in total.
	// Source: http://hearthstone.gamepedia.com/Card_pack_statistics#Golden_cards
	var chanceOfGetting = {
		common:    { normal: 0.7037, golden: 0.0148 },
		rare:      { normal: 0.216, golden: 0.0127 },
		epic:      { normal: 0.0408, golden: 0.0019 },
		legendary: { normal: 0.0094, golden: 0.0007 }
	};

	// Keeps track of how many cards and how much dust is missing
	var missingCards = {};
	var missingDust = {};

	// The collection of cards, divided by classes
	var classes = {};
	
	// Class and card quality currently selected in the tracker
	var selectedClass = "neutral";
	var selectedQuality = "normal";
	
	// Persistent settings
	var settings = {
		excludeGoldenCards: false,
		showOnlyMissingCards: false
	};
	
	var filterBySet = "all";
	var progressSet = ""; // Chosen set for the progress table
	
	// Currently unused
	var currentDust = 0;
	var disenchantedDust = 0;
	
	var version = 1.150;
	
	// Card object
	function card(name, rarity, mana, type, className, set, uncraftable) {
		this.name = name;
		this.rarity = rarity;
		this.mana = mana;
		this.type = type;
		this.className = className;
		this.set = set;
		this.uncraftable = uncraftable;
		this.normal = 0;
		this.golden = 0;
	}
	
	// Class object
	function classHS(name) {
		this.name = name;
		this.level = 1; // Currently unused
		this.cards = {
			free: {},
			common: {},
			rare: {},
			epic: {},
			legendary: {}
		};
		// Adds a card to this class
		this.addCard = function(card) {
			var rarity = card.rarity, set = card.set;
			var copies = getMaxCopies(rarity);
			this.cards[rarity][card.name] = card;
			
			for (var i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
				updateMissingCards(card, quality, copies);
				
				if (isCraftable(card, quality)) {
					var craftingCost = getCraftingCost(card, quality, copies);
					
					updateMissingDust(card, quality, craftingCost);
				}
			}
		}
	}
	/*********************************************************
	**************************UTILS***************************
	*********************************************************/	
	function capitalizeFirstLetter(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	
	function addThousandSeparator(number) {
		return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
	}
	
	function getMissingDataObject() {
		return {
				free:      { normal: 0, golden: 0 },
				common:    { normal: 0, golden: 0 },
				rare:      { normal: 0, golden: 0 },
				epic:      { normal: 0, golden: 0 },
				legendary: { normal: 0, golden: 0 },
				total:       { normal: 0, golden: 0 }
			};
	}
	/*********************************************************
	**************************INIT****************************
	*********************************************************/
	function initCollection() {
		initMissingData();
		initClasses();
		
	    importCards();
		
		for (var className in classes)
			sortCards(className);
	}
	
	function initClasses() {
		for (var className in classesEnum)
			classes[className] = new classHS(className);
	}
	
	function initMissingData() {
		for (var i = 0, missingData = missingCards; i < 2; i++, missingData = missingDust) {
			missingData.classes = {};
			for (var className in classesEnum) {
				missingData.classes[className] = {};
				for (var set in setsEnum)
					missingData.classes[className][set] = getMissingDataObject();
				missingData.classes[className].total = getMissingDataObject();
			}
			missingData.overall = {};
			for (var set in setsEnum)
				missingData.overall[set] = getMissingDataObject();
			
			missingData.overall.total = getMissingDataObject();
		}
	}

	function initSelectedQuality() {		
		var selectedQualityNormal = document.getElementById("selectedQualityNormal");
		var selectedQualityGolden = document.getElementById("selectedQualityGolden");
		
		selectedQualityNormal.addEventListener("click", function() { setSelectedQuality(this); });
		selectedQualityGolden.addEventListener("click", function() { setSelectedQuality(this); });
    }

	function initEventListeners() {
		document.getElementById("link-tracker").addEventListener("click", displayTracker);
		document.getElementById("link-progress").addEventListener("click", displayProgress);
		document.getElementById("link-packs").addEventListener("click", displayPacks);
		document.getElementById("link-news").addEventListener("click", displayNews);
		document.getElementById("link-about").addEventListener("click", displayAbout);			
		document.getElementById("link-export").addEventListener("click", exportCollection);
		document.getElementById("link-import").addEventListener("click", function() {
			// Check for File API support
			if (window.File && window.FileReader && window.FileList) {
				var elem = document.getElementById("files");
				elem.value = ""; // Allows multiple imports
				var event = new MouseEvent('click', {
					'view': window,
					'bubbles': true,
					'cancelable': true
				});
				elem.dispatchEvent(event); // Manually trigger the file input
			} else alert('Importing is not supported in this browser.');
		});		
		document.getElementById("files").addEventListener("change", importCollection);
	}
	
	// Initializes setsCards.
	// setsCards[set][rarity][className].cards = total cards
	// setsCards[set][rarity][className][quality] = craftable cards
	function initSetsCards() {
		setsCards = {};		
		
		for (var set in setsEnum)
			setsCards[set] = {};
		
		// Loop through every card in the collection and add
		// the card's copies to its correct places
		for (var className in classes)
			for (var rarity in classes[className].cards)
				for (var cardName in classes[className].cards[rarity]) {
					var card = classes[className].cards[rarity][cardName];
					var set = card.set;
					
					// Add the rarity to the set if it doesn't exist
					if (setsCards[set][rarity] === undefined)
						setsCards[set][rarity] = {};
					
					// Add the class to the rarity group if it doesn't exist
					if (setsCards[set][rarity][className] === undefined)
						setsCards[set][rarity][className] = {};
					
					if (setsCards[set][rarity][className].cards === undefined)
						setsCards[set][rarity][className].cards = 0;
					
					setsCards[set][rarity][className].cards += getMaxCopies(rarity);

					for (var i = 0, quality = "normal"; i < 2; i++, quality = "golden") {					
						if (setsCards[set][rarity][className][quality] === undefined)
							setsCards[set][rarity][className][quality] = 0;
						
						if (isCraftable(card, quality))
							setsCards[set][rarity][className][quality] += getMaxCopies(rarity);
					}
					
					// Add total to the rarity group if it doesn't exist
					if (setsCards[set][rarity].total === undefined)
						setsCards[set][rarity].total = {};
					
					if (setsCards[set][rarity].total.cards === undefined)
						setsCards[set][rarity].total.cards = 0;
					
					setsCards[set][rarity].total.cards += getMaxCopies(rarity);
					
					// Not used right now
					for (var i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
						if (setsCards[set][rarity].total[quality] === undefined)
							setsCards[set][rarity].total[quality] = 0;
						
						if (isCraftable(card, quality))
							setsCards[set][rarity].total[quality] += getMaxCopies(rarity);
					}
				}
		
		// Overall for all sets
		setsCards.total = {};
		for (var set in setsCards) {
			if (set === "total") break;
			for (var rarity in setsCards[set])
				for (var className in setsCards[set][rarity]) {
					// Add the rarity to the set if it doesn't exist
					if (setsCards.total[rarity] === undefined)
						setsCards.total[rarity] = {};
					
					// Add the class to the rarity group if it doesn't exist
					if (setsCards.total[rarity][className] === undefined)
						setsCards.total[rarity][className] = {};
					
					if (setsCards.total[rarity][className].cards === undefined)
						setsCards.total[rarity][className].cards = 0;
					
					setsCards.total[rarity][className].cards += setsCards[set][rarity][className].cards;
					
					for (var i = 0, quality = "normal"; i < 2; i++, quality = "golden") {
						if (setsCards.total[rarity][className][quality] === undefined)
							setsCards.total[rarity][className][quality] = 0;
						
						setsCards.total[rarity][className][quality] += setsCards[set][rarity][className][quality];
					}					
				}
		}		
	}

	function initHearthpwnTooltips() {
		var deferreds = [];

		// List of hearthstone cards grabbed 2016-03-31 from this chrome extension:
		// https://chrome.google.com/webstore/detail/hearthstone-linkifier/hgfciolhdhbagnccplcficnahgleflam
		//
		// Most valuable here are IDs in hearthpwn.com and wowhead.com databases.
		if (!window.HS_CardData) {
			var promise = (function() {
				var deferred = jQuery.Deferred();
				var request = new XMLHttpRequest();
				request.open("GET", "data/card-ids.json");
				request.onreadystatechange = function () {
					if(request.readyState === 4) {
						if(request.status === 200 || request.status == 0) {
							try {
								deferred.resolve(JSON.parse(request.responseText));
								return;
							} catch (e) {
								console.log('Error getting card IDs');
								console.log(e);
							}
						}
						deferred.reject();
					}
				}
				try {
					request.send(null);
				} catch(e) {
					console.log('Error getting card IDs');
					console.log(e);
					deferred.reject();
				}
				return deferred.promise();
			})();
			deferreds.push(promise.then(function(data) {
				window.HS_CardData = data;
			}));
		}

		// HearthPwn tooltip script
		// http://www.hearthpwn.com/tooltips
		if (!window.CurseTips) {
			var tt_url = '//static-hearth.cursecdn.com/current/js/syndication/tt.js';
			if (location.protocol == 'file:') {
				tt_url = 'http:' + tt_url;
			}

			// HearthPwn's tooltip script does not like being $.getScript()'ed.
			// It errs when it can't find its <script>. So, we have to include it by hand.
			var promise = (function() {
				var deferred = jQuery.Deferred();
				var $script = $('<script>').prop('src', tt_url).on("load error", function(e) {
					if (e.type === "error") {
						deferred.reject();
					} else {
						deferred.resolve();
					}
				});
				document.head.appendChild($script[0]);
				return deferred.promise();
			})();
			deferreds.push(promise);
		}

		// Init tooltips when dependencies are loaded
		return $.when.apply($, deferreds).then(function() {

			initTooltipDelay();

			// maps card name to hearthpwn id
			var card_ids = {};
			HS_CardData.forEach(function(card) {
				card_ids[card.name] = card.hpid;
			});
			var href_tmpl = 'http://www.hearthpwn.com/cards/%d';

			// Listen to mouse events and init tooltips on the fly
			$(document.body).on('mouseover', '#classCards li a', function(evt) {
				var $a = $(this);
				if ($a.hasClass('buttonAll') || $a.attr('data-tooltip-href')) {
					return;
				}
				var card_name = $a.text();
				if (!card_ids[card_name]) {
					return;
				}
				$a.attr('data-tooltip-href', href_tmpl.replace('%d', card_ids[card_name]));
				CurseTips['hearth-tooltip'].watchElements([$a[0]]);
				CurseTips['hearth-tooltip'].createTooltip(evt);
			});

			// Monkey-patch to delay showing tooltip
			function initTooltipDelay() {
				var mouseenter_ts = 0;
				var last_card_id = null;
				var self = CurseTips['hearth-tooltip'];

				// 100ms delay between mouseenter and requesting data
				var origCreateTooltip = self.createTooltip;
				self.createTooltip = function(q) {
					mouseenter_ts = Date.now();
					var card_id = last_card_id = (q.currentTarget.getAttribute("data-tooltip-href")||'').split('/').pop().split('?')[0];
					if (last_card_id) {
						q = $.extend({}, q);
						setTimeout(function() {
							if (card_id == last_card_id) {
								origCreateTooltip.call(self, q);
							}
						}, 100);
					}
				};

				// 500ms delay between mouseenter and showing tooltip
				var origHandleTooltipData = self.handleTooltipData;
				self.handleTooltipData = function(p) {
					var args = arguments;
					if (!p) {
						last_card_id = null;
						return origHandleTooltipData.apply(self, args);
					}
					setTimeout(function() {
						if (p.Id == last_card_id) {
							origHandleTooltipData.apply(self, args);
						}
					}, Math.max(0, 500 - (Date.now() - mouseenter_ts)));
				};
			}
		});
	}

	/*********************************************************
	**********************LOCAL STORAGE***********************
	*********************************************************/
	function loadLocalStorage() {
		classes = JSON.parse(localStorage.getItem('classes'));
		missingCards = JSON.parse(localStorage.getItem("missingCards"));
		missingDust = JSON.parse(localStorage.getItem("missingDust"));
		currentDust = parseInt(localStorage.getItem("currentDust"));
		disenchantedDust = parseInt(localStorage.getItem("disenchantedDust"));
		// In case user has never changed a setting
		if (localStorage.getItem("settings") !== null)
		    settings = JSON.parse(localStorage.getItem("settings"));
	}
	
	function updateLocalStorage() {
		localStorage.setItem('classes', JSON.stringify(classes));
		localStorage.setItem('missingCards', JSON.stringify(missingCards));
		localStorage.setItem('missingDust', JSON.stringify(missingDust));
	}
	/*********************************************************
	**********************CARD FUNCTIONS**********************
	*********************************************************/
	// Imports cards from the Hearthstone API
	function importCards() {
		// Maps Hearthstone API set names to HCT setsEnum
		var setMap = {
			"Basic": setsEnum.basic,
			"Classic": setsEnum.classic,
			"Reward": setsEnum.reward,
			"Promotion": setsEnum.promo,
			"Naxxramas": setsEnum.naxxramas,
			"Goblins vs Gnomes": setsEnum.gvg,
			"Blackrock Mountain": setsEnum.blackrock,
			"The Grand Tournament": setsEnum.tgt,
			"The League of Explorers": setsEnum.loe
		};
		
		var importCardData = function (cards, set) {
			cards.forEach(function (newCard) {
				if (newCard.type != 'Hero') {
					var className = newCard.playerClass ? newCard.playerClass.toLowerCase() : classesEnum.neutral;
					// Cards like Elven Archer are in the basic set with common rarity, but setting these to free to preserve HCT behavior
					var rarity = set == setsEnum.basic ? raritiesEnum.free : newCard.rarity.toLowerCase();
					classes[className].addCard(new card(newCard.name, rarity, newCard.cost, newCard.type.toLowerCase(), className, set, setsUncraftable[set]));
				}
			});
		};
		
		$.ajax({
			url: "https://omgvamp-hearthstone-v1.p.mashape.com/cards?collectible=1",
			headers: {
				"X-Mashape-Key": "VzmtuqVrkimshv2u8P4w9f9DUFtgp1SOM1ejsneCCd1lVJuVEM"
			},
			async: false
		}).done(function (response) {
			Object.keys(setMap).forEach (function (apiSet) {
				var set = setMap[apiSet];
				if (set) {
					importCardData(response[apiSet], set);
				} else {
					console.log("ERROR: Unrecognized card set " + newCard.cardSet + ", skipping card " + newCard.name);
				}
			});
		}).fail(function() {
			importCardsOffline();
		});
	}
	
	// Imports cards from a local JSON-file
	function importCardsOffline() {
		var cardData;
		var request = new XMLHttpRequest();
		request.open("GET", "data/all-collectibles.json", false);
		request.onreadystatechange = function () {
			if(request.readyState === 4) {
				if(request.status === 200 || request.status == 0) {
					cardData = JSON.parse(request.responseText);
				}
			}
		}
		request.send(null);
		
		for (var i = 0, l = cardData.cards.length; i < l; i++) {
			var c = cardData.cards[i];
			var rarity = c.set === "basic" ? "free" : c.quality;
			var type = c.type === undefined ? c.category : c.type;
			
			classes[c.hero].addCard(new card(c.name, rarity, c.mana,
				type, c.hero, c.set, setsUncraftable[c.set]));
		}	
	}
	
	// Sorts all the card lists for the specified class.
	// Sorting order:
	// Mana cost: Lower > higher
	// Type: Weapon > spell > minion
	// Name: Lexicographical order
	function sortCards(className) {
		var cardList = classes[className].cards;
		
		for (var rarity in cardList) {
			var sortedArray = [];
			for (var name in cardList[rarity])
				sortedArray.push([name, cardList[rarity][name]]);
			sortedArray.sort(function(a, b) {
			    return a[1].mana == b[1].mana ?
				a[1].type === b[1].type ?
				a[1].name.localeCompare(b[1].name) :
				a[1].type === "weapon" ? -1 :
				b[1].type === "weapon" ? 1 :
				a[1].type === "spell" ? -1 :
				1 :	a[1].mana - b[1].mana;
				});
			
			var sortedList = {};
			for (var i = 0; i < sortedArray.length; ++i)
				if (sortedArray[i] !== undefined)
					sortedList[sortedArray[i][0]] = sortedArray[i][1];
		
			cardList[rarity] = sortedList;
		}
	}
	
	// Adds or removes copies of a card
	function updateCard(card, quality, copies) {
		card[quality] += copies;
		updateMissingCards(card, quality, -copies);
		
		if (isCraftable(card, quality)) {
		    var craftingCost = getCraftingCost(card, quality, copies);
		
		    updateMissingDust(card, quality, -craftingCost);
		}
	}
	
	// Updates missingCards by the amount of copies specified
	function updateMissingCards(card, quality, copies) {
		var className = card.className, set = card.set, rarity = card.rarity;
		
		missingCards.classes[className][set][rarity][quality] += copies;
		missingCards.classes[className][set].total[quality] += copies;
		missingCards.classes[className].total[rarity][quality] += copies;
		missingCards.classes[className].total.total[quality] += copies;
		
		missingCards.overall[set][rarity][quality] += copies;
		missingCards.overall[set].total[quality] += copies;
		missingCards.overall.total[rarity][quality] += copies;
		missingCards.overall.total.total[quality] += copies;
	}
	
	// Updates missingDust by the amount of dust specified
	function updateMissingDust(card, quality, dust) {
		var className = card.className, set = card.set, rarity = card.rarity;
		
		missingDust.classes[className][set][card.rarity][quality] += dust;
		missingDust.classes[className][set].total[quality] += dust;
		missingDust.classes[className].total[rarity][quality] += dust;
		missingDust.classes[className].total.total[quality] += dust;
		
		missingDust.overall[set][rarity][quality] += dust;
		missingDust.overall[set].total[quality] += dust;
		missingDust.overall.total[rarity][quality] += dust;
		missingDust.overall.total.total[quality] += dust;
	}
	
	// Adds a copy of a card through clicking on an <li><a> element
	function addCard(card) {
		var rarity = card.rarity;
		
		if (card[selectedQuality] < getMaxCopies(rarity)) {
			updateCard(card, selectedQuality, 1);
			
		    updateLocalStorage();
			displayCards(selectedClass);
			displayMissingCards();
			displayMissingCardsOverall();
			displayMissingDust();
			displayMissingDustOverall();
		}
	}
	
	// Removes a copy of a card through right-clicking on an <li><a> element
	function removeCard(card) {
		var rarity = card.rarity;
		
		if (card[selectedQuality] > 0) {
		    updateCard(card, selectedQuality, -1);
		
			updateLocalStorage();
			displayCards(selectedClass);
			displayMissingCards();
			displayMissingCardsOverall();
			displayMissingDust();
			displayMissingDustOverall();
		}
	}	
	
	// Adds max amount of copies to all cards in the column that was selected
	// by clicking on the "apply to all" button
	function addAll(element) {
		var list = element.parentNode.parentNode.getElementsByTagName("a");
		var rarity = element.parentNode.parentNode.id;		
		rarity = rarity.slice(5, rarity.length); // Cut out the "list" part
		
		for (var i = 1, len = list.length; i < len; i++) {			
			var card = classes[selectedClass].cards[rarity][list[i].innerHTML];
			
			if (card[selectedQuality] < getMaxCopies(rarity))
			    updateCard(card, selectedQuality, getMaxCopies(rarity) - card[selectedQuality]);
		}
		
		updateLocalStorage();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
	}
	
	// Removes all copies of all cards in the column that was selected
	// by right-clicking on the "apply to all" button
	function removeAll(element) {
		var list = element.parentNode.parentNode.getElementsByTagName("a");
		var rarity = element.parentNode.parentNode.id;		
		rarity = rarity.slice(5, rarity.length); // Cut out the "list" part
		
		for (var i = 1, len = list.length; i < len; i++) {			
			var card = classes[selectedClass].cards[rarity][list[i].innerHTML];
			
			if (card[selectedQuality] > 0)
			    updateCard(card, selectedQuality, -card[selectedQuality]);
		}
		
		updateLocalStorage();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
	}
	
	// Changes the selected quality through clicking on the top buttons
	function setSelectedQuality(element) {
		if (element.getAttribute("id") === "selectedQualityNormal")
			document.getElementById("selectedQualityGolden").removeAttribute("class");
		else document.getElementById("selectedQualityNormal").removeAttribute("class");
		
		selectedQuality = element.innerHTML.toLowerCase();
		element.setAttribute("class", "selected");
    }
	
	function getMaxCopies(rarity) {
		return rarity === "legendary" ? 1 : 2;
	}
	
	function isCraftable(card, quality) {
		return card.uncraftable !== "both" && card.uncraftable !== quality;
	}
	
	function getCraftingCost(card, quality, copies) {
		return craftingCost[card.rarity][quality] * copies;
	}
	/*********************************************************
	*************************DISPLAY**************************
	*********************************************************/
	// Displays the class tabs and the class tabs bar.
	// Created dynamically except filter options
	function displayClassTabs() {
		var div = document.getElementById("classTabs");
		var list = document.createElement("ul");
		// Set the CSS color of the class tabs bar (default neutral)
		var classTabsClass = document.getElementById("classTabsBar").getAttribute("class");		
		document.getElementById("classTabsBar").setAttribute("class", classTabsClass + " " + selectedClass);
		
		// Create the class tabs
		for (var className in classes) {
			var listItem = document.createElement("li");
			listItem.setAttribute("class", "col-xs-10ths nopadding");
			var listItemLink = document.createElement("a");
			var span = document.createElement("span");
			span.innerHTML = classes[className].level; // Always level 1 for now				
			/* ---------------------------------------------
			 To enable users to manually enter class levels.
			 Not yet implemented
			 
				//span.setAttribute("contenteditable", true);
				/* BECAUSE EVENT LISTENERS NO WORKY ON THIS SPAN.
				USE FORM INSTEAD? */
				/*span.setAttribute("onkeypress", "return handleKey(this, event)");
				span.setAttribute("onblur", "lol(this)");
				span.setAttribute("onpaste", "return false");
				span.setAttribute("ondrop", "return false");*
			/* --------------------------------------------- */
			listItemLink.appendChild(span);
			
			// Displays the class levels, but it's pointless for now
			//if (className === "neutral")
				listItemLink.innerHTML = className;
			//else {
			//	listItemLink.innerHTML = className + "<br>(" + listItemLink.innerHTML;
			//	listItemLink.innerHTML += ")";
			//}
			
			// Closure function for when clicking on a class tab
			(function (className) {
				listItemLink.addEventListener("click", function() {
					// Switch class tabs color and selected class
					document.getElementById("classTabsBar").setAttribute("class",
						classTabsClass + " " + className);
					selectedClass = className;
					
					// No need to re-display the class tabs
					displayCards(className);
					displayMissingCards();
					displayMissingDust();
				});
			}(className))
			
			// Prevent users from selecting class tabs text
			listItemLink.setAttribute("class", className + " " + "noselect");
			
			listItem.appendChild(listItemLink);
			list.appendChild(listItem);
		}
		div.appendChild(list);
		
		// Init left filter list (filter sets described in HTML)
		var filterListLeft = document.getElementById("filtersLeft").getElementsByTagName("a");
		for (var i = 0; i < filterListLeft.length; i++) {
			var filterListItem = filterListLeft[i];
			// Set the initial filter as selected
			if (filterBySet === filterListItem.innerHTML.toLowerCase())
				filterListItem.setAttribute("class", "selected");
			// Closure function for when clicking on a filter
	        (function (filterListItem) {
			    filterListItem.addEventListener("click", function() {
					// Switch selected filter
					filterBySet = filterListItem.innerHTML.toLowerCase();
					
					// Deselect all other filters
					var filterListLeft = document.getElementById("filtersLeft").getElementsByTagName("a");
					for (var i = 0; i < filterListLeft.length; i++)
                      filterListLeft[i].removeAttribute("class");
				    filterListItem.setAttribute("class", "selected");
					
					// Display the cards and missing data with the new filter
					displayCards(selectedClass);
					displayMissingCards();
					displayMissingCardsOverall();
					displayMissingDust();
					displayMissingDustOverall();
					});
			}(filterListItem))
		}
		
		// Init right filter list. Currently only one button
		var filterListRight = document.getElementById("filtersRight").getElementsByTagName("a")[0];
		// Set the button as selected if the setting is turned on
		if (settings.showOnlyMissingCards)
			filterListRight.setAttribute("class", "selected");
		
		// Function for when clicking the showOnlyMissingCards button
	    filterListRight.addEventListener("click", function() {
			// Switch the setting and save the change locally
			settings.showOnlyMissingCards = !settings.showOnlyMissingCards;
			localStorage.setItem("settings", JSON.stringify(settings));
			
			// Display the new change in the CSS
			if (settings.showOnlyMissingCards)
			    filterListRight.setAttribute("class", "selected");
			else filterListRight.removeAttribute("class");
			
			// Display the cards with the new setting
			displayCards(selectedClass);
			});
	}
	
	// Displays the card lists for the specified class.
	// Created dynamically except for the list names
	function displayCards(className) {
		var cardList = classes[className].cards;
		
		// One list for each rarity in the game
		for (var rarity in raritiesEnum) {
			// Empty the HTML lists
			var list = document.getElementById("list_" + rarity);
			while (list.firstChild)
				list.removeChild(list.firstChild);
			// TEMPORARY TO MAKE LISTS FIXED WIDTH WHEN EMPTY
			//list.innerHTML="&nbsp";
			
			// Init the "apply to all" button
			var listItem = document.createElement("li");
			var linkItemLink = document.createElement("a");
			linkItemLink.textContent = "Apply to all";
			linkItemLink.setAttribute("class", "buttonAll");
			linkItemLink.addEventListener("click", function() { addAll(this); });
			linkItemLink.addEventListener("contextmenu", function() { removeAll(this); });
			listItem.appendChild(linkItemLink);
			list.appendChild(listItem);
			
			// Loop through all cards in the collection of the selected class.
			// List is already sorted
			for (var name in cardList[rarity]) {
				var card = cardList[rarity][name];
				
				// Only display the card if it isn't filtered out
				if (filterBySet === "all" || card.set === filterBySet) {
					// Only display the card if show missing cards is off,
					// or the card is actually missing from your collection
					if (!settings.showOnlyMissingCards || (settings.showOnlyMissingCards && 
					(!settings.excludeGoldenCards && (card.normal < getMaxCopies(rarity) || card.golden < getMaxCopies(rarity))) ||
					(settings.excludeGoldenCards && (card.normal < getMaxCopies(rarity)))
					)) {
				        var listItem = document.createElement("li");
				        var listItemLink = document.createElement("a");
				        listItemLink.textContent = name;
				        (function (card) {
					        listItemLink.addEventListener("click", function() { addCard(card); });
					        listItemLink.addEventListener("contextmenu", function() { removeCard(card); });
					        }(card))
						// Set the CSS for the card depending on how many copies in the collection
				        listItemLink.setAttribute("class", "normal" + cardList[rarity][name].normal + " " +
							"golden" + cardList[rarity][name].golden + " " + "noselect");
			
				        listItem.appendChild(listItemLink);
				        list.appendChild(listItem);
					}
				}
			}
		}
	}
		
	// Displays the missing cards data for the selected class
	function displayMissingCards() {
		document.getElementById("missingCardsClassTitle").innerHTML = selectedClass.toUpperCase();
		
		if (filterBySet === "all")
			missingData = missingCards.classes[selectedClass].total;
		else missingData = missingCards.classes[selectedClass][filterBySet];
		
		for (var rarity in missingData) {
			var rarityCapitalized = capitalizeFirstLetter(rarity);
			var td = document.getElementById("classMissing" + rarityCapitalized + "Normal");
			var normal = missingData[rarity].normal;
			td.innerHTML = normal;
			td = document.getElementById("classMissing" + rarityCapitalized + "Golden");
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missingData[rarity].golden;
		}
	}
	
	// Displays the missing cards data overall
	function displayMissingCardsOverall() {
		if (filterBySet === "all")
			missingData = missingCards.overall.total;
		else missingData = missingCards.overall[filterBySet];
		
		for (var rarity in missingData) {
			var rarityCapitalized = capitalizeFirstLetter(rarity);
			var td = document.getElementById("overallMissing" + rarityCapitalized + "Normal");
			var normal = missingData[rarity].normal;
			td.innerHTML = normal;
			td = document.getElementById("overallMissing" + rarityCapitalized + "Golden");
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
			    td.innerHTML = "";
			else td.innerHTML = missingData[rarity].golden;
		}
	}
	
	// Displays the missing dust data for the selected class
	function displayMissingDust() {
		if (filterBySet === "all")
			missingData = missingDust.classes[selectedClass].total;
		else missingData = missingDust.classes[selectedClass][filterBySet];
		
		for (var rarity in missingData) {
			var rarityCapitalized = capitalizeFirstLetter(rarity);
			var td = document.getElementById("classMissingDust" + rarityCapitalized);
			var dust = 0;
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
				dust = missingData[rarity].normal;
			else dust = missingData[rarity].normal +
				missingData[rarity].golden;
			td.innerHTML = addThousandSeparator(dust);
		}
	}
	
	// Displays the missing dust data overall
	function displayMissingDustOverall() {
		if (filterBySet === "all")
			missingData = missingDust.overall.total;
		else missingData = missingDust.overall[filterBySet];
		
		for (var rarity in missingData) {
			var rarityCapitalized = capitalizeFirstLetter(rarity);
			var td = document.getElementById("overallMissingDust" + rarityCapitalized);
			var dust = 0;
			// Don't show golden data if exclude golden cards is on
			if (settings.excludeGoldenCards)
				dust = missingData[rarity].normal;
			else dust = missingData[rarity].normal +
				missingData[rarity].golden;
			td.innerHTML = addThousandSeparator(dust);
		}
	}
	
	// Toggles the exclude golden cards setting and updates view
	function toggleGoldenCards() {
		settings.excludeGoldenCards = !settings.excludeGoldenCards;
		localStorage.setItem("settings", JSON.stringify(settings));
		displayMissingDust();
		displayMissingDustOverall();
		displayMissingCards();
		displayMissingCardsOverall();
		displayCards(selectedClass);
	}
	/*********************************************************
	***********************PROGRESS PAGE**********************
	*********************************************************/
	// Displays a progress table for the selected set in the drop-down list
	function displayProgressTable(evt) {
		// Function is invoked by code when accessing the progress page,
		// which means evt is undefined and that the last selected table
		// should be displayed.
		if (evt != undefined) {
		    // Only display one table at all times
		    document.getElementById("containerRow").childNodes[1].removeChild(
		        document.getElementById("containerRow").childNodes[1].lastChild);
		
		    progressSet = evt.target.value;
		}
		else document.getElementById('select').value = progressSet;
		
		var table = createProgressTable(progressSet);
		
		document.getElementById("containerRow").childNodes[1].appendChild(table);
	}
	
	// Creates and returns a progress table of the specified set
	function createProgressTable(set) {
		var table = document.createElement("table");
		table.setAttribute("id", "progressTable");
		
		// Create the header
		var tr = document.createElement("tr");
		var td = document.createElement("th");
		// Set the selected set as the header text
		td.innerHTML = document.getElementById('select').
			options[document.getElementById('select').selectedIndex].text.toUpperCase();
		td.setAttribute("colspan", 13);
		tr.appendChild(td);
		table.appendChild(tr);
		
		// Create rarities row
		tr = document.createElement("tr");
		tr.appendChild(document.createElement("td"));
		for (rarity in setsCards[set]) {
		    td = document.createElement("td");
		    td.innerHTML = capitalizeFirstLetter(rarity);
		    tr.appendChild(td);
		    tr.appendChild(document.createElement("td"));
		}
		td = document.createElement("td");
		td.innerHTML = "All";
		tr.appendChild(td);
		tr.appendChild(document.createElement("td"));		
		
		table.appendChild(tr);
		
		// Create the class rows
		for (className in classesEnum) {
			table.appendChild(createProgressTableRow("normal", set, className));
			// Exclude golden data if the setting is on
			if (!settings.excludeGoldenCards)
			    table.appendChild(createProgressTableRow("golden", set, className));
		}
		// Create the total rows
		table.appendChild(createProgressTableRow("normal", set, "total"));
		if (!settings.excludeGoldenCards)
		    table.appendChild(createProgressTableRow("golden", set, "total"));
		
		return table;
	}
	
	// Creates and returns a progress table row
	function createProgressTableRow(quality, set, className) {
		var tr = document.createElement("tr");
		tr.setAttribute("class", className);
		var td = document.createElement("td");
		
		// Only print out the class name on the first row
		if (quality == "normal")
		    td.innerHTML = capitalizeFirstLetter(className);
		
		tr.appendChild(td);
		
		// Create table data for all rarities
		for (rarity in setsCards[set]) {
			// Create the cards table data
		    var td = document.createElement("td");
			var text;
			var total = 0;

			if (setsCards[set][rarity][className] != undefined)
				total = setsCards[set][rarity][className].cards;
			
			// If no collectible cards for this class/set/rarity
			if (total == 0)
				text = "-";
			else {
				var missing;
				// Total row have its own data
				if (className != "total")
			        missing = missingCards.classes[className][set][rarity][quality];
				else missing = missingCards.overall[set][rarity][quality];
				// Example: 0/50 (0%)
				text = total - missing + "/" + total +
				   	   " (" + Math.floor(((total - missing) / total) * 100) + "%)";
			
			}
		    td.innerHTML = text;
			tr.appendChild(td);
			
			// Create the dust table data
			td = document.createElement("td");
			
			// If no collectible cards for this class/set/rarity or if they're uncraftable
			if (total == 0 || setsUncraftable[set] == "both" || setsUncraftable[set] == quality)
					text = "-";
			else {
			    var totalDust = setsCards[set][rarity][className][quality] * craftingCost[rarity][quality];
				var currDust = 0;
				if (className != "total")
			        currDust = totalDust - missingDust.classes[className][set][rarity][quality];
				else currDust = totalDust - missingDust.overall[set][rarity][quality];
				// No need to print out % here as it's the same as the card data %
				if (totalDust == 0)
					text = "-";
				else text = " " + currDust + "/" + totalDust;
			}
			td.innerHTML = text;
			tr.appendChild(td);
		}
		
		// All rarities combined
		var td = document.createElement("td");
		var text;
		var total = 0;
	
		for (rarity in setsCards[set])
			if (setsCards[set][rarity][className] != undefined)
				total += setsCards[set][rarity][className].cards;
		
		if (total == 0)
			text = "-";
		else {
			var missing;
			if (className != "total")
				missing = missingCards.classes[className][set].total[quality];
			else missing = missingCards.overall[set].total[quality];
			text = total - missing + "/" + total +
				   " (" + Math.floor(((total - missing) / total) * 100) + "%)";
		}
		td.innerHTML = text;
		tr.appendChild(td);
		
		td = document.createElement("td");
		
		if (total == 0 || setsUncraftable[set] == "both" || setsUncraftable[set] == quality)
				text = "-";
		else {
			var totalDust = 0;
			for (rarity in setsCards[set])
				if (setsCards[set][rarity][className] != undefined)
					totalDust += setsCards[set][rarity][className][quality] * craftingCost[rarity][quality];
			var currDust = 0;
			
			if (className != "total")
			    currDust = totalDust - missingDust.classes[className][set].total[quality];
			else currDust = totalDust - missingDust.overall[set].total[quality];
			text = " " + currDust + "/" + totalDust +
				   " (" + Math.floor((currDust / totalDust) * 100) + "%)";
		}
		td.innerHTML = text;
		tr.appendChild(td);
		
		return tr;
	}
	/*********************************************************
	************************PACK GUIDE************************
	*********************************************************/
	// Calculates and displays the dust values.
	// Needs more commenting
	function updatePackGuide() {
		var averageValue = 0;
		for (set in packsEnum) {
		    for (rarity in chanceOfGetting) {
		            averageValue += chanceOfGetting[rarity].normal * (((setsCards[set][rarity].total.cards - missingCards.overall[set][rarity].normal) / setsCards[set][rarity].total.cards) * disenchantmentValue[rarity].normal
		                + (missingCards.overall[set][rarity].normal / setsCards[set][rarity].total.cards) * craftingCost[rarity].normal);
					if (!settings.excludeGoldenCards)
					    averageValue += chanceOfGetting[rarity].golden * (((setsCards[set][rarity].total.cards - missingCards.overall[set][rarity].golden) / setsCards[set][rarity].total.cards) * disenchantmentValue[rarity].golden
		                    + (missingCards.overall[set][rarity].golden / setsCards[set][rarity].total.cards) * craftingCost[rarity].golden);
					else averageValue += chanceOfGetting[rarity].golden * disenchantmentValue[rarity].golden;
				}
		
		    document.getElementById(set + "AverageDust").innerHTML = (averageValue * 5).toFixed(1);
			averageValue = 0;
		}
	}
	
	function updateChestGuide() {
		var averageDust = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		var total = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		var missing = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		for (set in packsEnum) {
		    for (rarity in averageDust) {
				total[rarity] += setsCards[set][rarity].total.cards;
				missing[rarity] += missingCards.overall[set][rarity].golden;
			}
		}
		
		for (rarity in averageDust) {
		    if (!settings.excludeGoldenCards)
			    averageDust[rarity] += ((total[rarity] - missing[rarity]) / total[rarity]) * disenchantmentValue[rarity].golden
		            + (missing[rarity] / total[rarity]) * craftingCost[rarity].golden;
		    else averageDust[rarity] = disenchantmentValue[rarity].golden;
		}
		
		document.getElementById("chest20AverageDust").innerHTML = (averageDust.common + 5).toFixed(1);
		document.getElementById("chest15AverageDust").innerHTML = (averageDust.common + averageDust.rare + 5).toFixed(1);
		document.getElementById("chest10AverageDust").innerHTML = (averageDust.common * 2 + averageDust.rare + 5).toFixed(1);
		document.getElementById("chest5AverageDust").innerHTML = (averageDust.common * 2 + averageDust.epic + 5).toFixed(1);
		document.getElementById("chestLegendaryAverageDust").innerHTML = (averageDust.common * 3 + averageDust.epic).toFixed(1);
	}
	/*********************************************************
	**********************HTML TEMPLATES**********************
	*********************************************************/
	function displayAbout() {
		var template = document.getElementById("template-about").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}

	function displayNews() {
		var template = document.getElementById("template-news").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		// If news page was updated, remove the news highlight when clicking on the button
	    var news = document.getElementById("link-news");
		news.className = news.className.replace(" news", "");
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayPacks() {
		var template = document.getElementById("template-packs").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		if (setsCards === undefined)
			initSetsCards();
		
		updatePackGuide();
		updateChestGuide();
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayTracker() {
		var template = document.getElementById("template-tracker").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		displayClassTabs();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
		
		document.getElementById("checkboxGolden").addEventListener("change", toggleGoldenCards);
		document.getElementById("checkboxGolden").checked = settings.excludeGoldenCards;
		
		// Make sure the quality buttons are visible while on the tracker
		document.getElementById("header-center").style.visibility = "visible";
		
		// Disable the context menu when right-clicking while on the tracker
		document.oncontextmenu = function() {
            return false;
        }
	}
	
	function displayProgress() {
		var template = document.getElementById("template-progress");
		document.getElementById("containerRow").innerHTML = template.innerHTML;
		
		if (setsCards === undefined)
			initSetsCards();
		
		// Add an event listener to the drop-down list that will display a table
		document.getElementById('select').addEventListener('change', displayProgressTable);
		
		if (progressSet != "")
		    displayProgressTable();
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	/*********************************************************
	************************COLLECTION************************
	*********************************************************/
	// Loads data from a collection. Make sure it's the right
	// format, else handle potential errors
	function loadCollection(collection) {
		console.log("Loading collection...");
		for (var className in collection)
			// level here
			for (var rarity in collection[className].cards)
				for (var cardName in collection[className].cards[rarity]) {
					var cardCollection = classes[className].cards[rarity][cardName];
					var cardLoaded = collection[className].cards[rarity][cardName];
					
					// Ignore loaded cards that do not exist in the collection
					if (cardCollection !== undefined)
						for (var i = 0, quality = "normal"; i < 2; i++, quality = "golden")
						    updateCard(cardCollection, quality, cardLoaded[quality]);
				}
	}
	
	// Imports a collection from a JSON file
	function importCollection(event) {
	    var files = event.target.files; // FileList object

        var file = files[0]; // Selected file
        // Only process JSON files.
        if (!file.name.match(/[^\\]*\.(json)$/i)) {
			alert("Not a JSON file.");
            return;
        }

        var reader = new FileReader();

        // Closure to capture the file information
        reader.onload = (function(event) {
	        try {
			    var collection = JSON.parse(event.target.result);
				// Reset and load the collection
				initCollection();
			    loadCollection(collection);
				updateLocalStorage();
				displayTracker();
		    }
		    catch(e) {
				if (e instanceof SyntaxError)
					alert("Invalid JSON file.");
				else if (e instanceof TypeError)
			        alert("Invalid HSCT file");
				else alert(e);
				
				return; // Abort import
		    }
        });

        // Read in the JSON file as text
		reader.readAsText(file);
	}
	
	// Exports the collection to a JSON file
	function exportCollection() {
		// Check for File API support
        if (window.Blob) {
		    var blob = new Blob([JSON.stringify(classes)],
				{ type: "text/plain;charset=utf-8;"} );
            saveAs(blob, "HSCT.json");
		} else alert('Exporting is not supported in this browser.');
	}
	/*********************************************************
	***********************MAIN FUNCTION**********************
	*********************************************************/
	return {
		init: function() {
		//	console.log(JSON.stringify(localStorage).length);
			// Check for HTML5 storage support
			if (typeof(Storage) !== "undefined") {
				var storedVersion = localStorage.getItem("version");
				
				// If first visit or new version
				if (storedVersion != version) {
					initCollection();
					
					// If new version, restore saved collection/settings
					if (parseFloat(storedVersion) < parseFloat(version)) {
						var storedCollection = JSON.parse(localStorage.getItem('classes'));
						var storedSettings = JSON.parse(localStorage.getItem('settings'));
						
						loadCollection(storedCollection);
						
						for (var setting in storedSettings)
						    settings[setting] = storedSettings[setting];
						
						// Highlight the news button
						var news = document.getElementById("link-news");
						news.className = news.className + " news";
					}
					
				    updateLocalStorage();
					localStorage.setItem("currentDust", currentDust);
					localStorage.setItem("disenchantedDust", disenchantedDust);
					localStorage.setItem("version", version);
				}
				else loadLocalStorage();
			}
			
			initHearthpwnTooltips();
			initSelectedQuality();
			initEventListeners();
			displayTracker();
		}
	};
})();

window.onload = HSCollectionTracker.init();
/*********************************************************
************************UNFINISHED************************
*********************************************************/
		//var request = new XMLHttpRequest();
		//request.open("GET", "data/all-collectibles.json", false);
		//request.send(null);
		//var my_JSON_object = JSON.parse(request.responseText);
		//console.log(my_JSON_object.cards);
//alert(Object.keys(classEnum).length);

	/*function handleKey(element, event) {
	  var a = String.fromCharCode(event.keyCode);
	  console.log(a); 
	  console.log(element.parentNode.innerText.split(" ")[0]);
	  if (/\d/.test(a)) {
		  if (window.getSelection().type == "Range")
			  if (element.innerHTML.length <= 2)
				  return true;
			  else return false;
		  
		  else if (element.innerHTML.length + 1 <= 2)
			return true;
		}
	  return false;
	}*/
	
   /*function lol(e) {
	   window.getSelection().removeAllRanges();
	   document.selection.empty();
	   console.log(e);
		//e.innerHTML = "lol";
	}*/
	
	/*$('span[contenteditable]').keydown(function(e) {
		// trap the return key being pressed
		if (e.keyCode === 13) {
		  // insert 2 br tags (if only one br tag is inserted the cursor won't go to the next line)
		  //document.execCommand('insertHTML', false, '<br><br>');
		  document.getElementById("a").blur();
		  // prevent the default behaviour of return key pressed
		  return false;
		}
	  });*/