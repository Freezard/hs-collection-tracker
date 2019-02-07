/*  main.js
    Hearthstone Collection Tracker
*/
var cheerio = require("cheerio");

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
		hof: "hof",
		naxxramas: "naxxramas",
		gvg: "gvg",
		blackrock: "blackrock",
		tgt: "tgt",
		loe: "loe",
		wotog: "wotog",
		onik: "onik",
		msog: "msog",
		ungoro: "ungoro",
		kotft: "kotft",
		kobolds: "kobolds",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan"
	};

	var standardSetsEnum = {
		basic: "basic",
		classic: "classic",
		ungoro: "ungoro",
		kotft: "kotft",
		kobolds: "kobolds",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan"
	};

	// The number of cards and craftable cards in each set.
	// Created dynamically when visiting progress page/pack guide
	var setsCards;
	
	// Lists which card qualities are uncraftable for each set
	var setsUncraftable = {
		basic: "both",
		classic: "none",
		//reward: "none",
		//promo: "golden",
		hof: "none",
		naxxramas: "none",
		gvg: "none",
		blackrock: "none",
		tgt: "none",
		loe: "none",
		wotog: "none",
		ungoro: "none",
		kotft: "none",
		kobolds: "none",
		witchwood: "none",
		boomsday: "none",
		rastakhan: "none"
	};
	
	var packsEnum = {
		classic: "classic",
		gvg: "gvg",
		tgt: "tgt",
		wotog: "wotog",
		msog: "msog",
		ungoro: "ungoro",
		kotft: "kotft",
		kobolds: "kobolds",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan"
	};
	
	var rewardsEnum = {
		classic: "classic",
		ungoro: "ungoro",
		kotft: "kotft",
		kobolds: "kobolds",
		witchwood: "witchwood",
		boomsday: "boomsday",
		rastakhan: "rastakhan"
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
	var classAll = {};

	// Class and card quality currently selected in the tracker
	var selectedClass = "all";
	var selectedQuality = "normal";
	
	// Persistent settings
	var settings = {
		excludeGoldenCards: false,
		hideFreeCards: false,
		showOnlyMissingCards: false
	};
	
	var filterBySet = "standard";
	var progressSet = ""; // Chosen set for the progress table
	
	// Currently unused
	var currentDust = 0;
	var disenchantedDust = 0;
	
	var version = 2.29;
	
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

			if (this.name == 'all')
				return;

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
	
	function getProgressDataObject() {
		return {
				free:      0,
				common:    0,
				rare:      0,
				epic:      0,
				legendary: 0,
				total:     0,
				all:       0
			};
	}
	
	function createProgressData(quality, sets, className) {
		var data = {
			totalCards: getProgressDataObject(),
			missingCards: getProgressDataObject(),
			totalDust: getProgressDataObject(),
			missingDust: getProgressDataObject()
		};
		
		for (var set in sets)
			for (var rarity in setsCards[set]) {
				if (setsCards[set][rarity][className] != undefined) {
				    data.totalCards[rarity] += setsCards[set][rarity][className].cards;
					data.totalCards.all += setsCards[set][rarity][className].cards;
				}
				// Total row has its own data
				if (className != "total") {
			        data.missingCards[rarity] += missingCards.classes[className][set][rarity][quality];
					data.missingCards.all += missingCards.classes[className][set][rarity][quality];
				}
				else {
					data.missingCards[rarity] += missingCards.overall[set][rarity][quality];
					data.missingCards.all += missingCards.overall[set][rarity][quality];
				}
				
				if(setsUncraftable[set] != "both" && setsUncraftable[set] != quality && setsCards[set][rarity][className] != undefined) {
				    data.totalDust[rarity] += setsCards[set][rarity][className][quality] * craftingCost[rarity][quality];
					data.totalDust.all += setsCards[set][rarity][className][quality] * craftingCost[rarity][quality];
					
					if (className != "total") {
			            data.missingDust[rarity] += missingDust.classes[className][set][rarity][quality];
						data.missingDust.all += missingDust.classes[className][set][rarity][quality];
					}
				    else {
						data.missingDust[rarity] += missingDust.overall[set][rarity][quality];
						data.missingDust.all += missingDust.overall[set][rarity][quality];
					}
				}
			}
			
		return data;
	}

	function getData(fileName) {
		var data;
		
		var request = new XMLHttpRequest();
		request.open("GET", "data/" + fileName + ".json", false);
		request.onreadystatechange = function () {
			if(request.readyState === 4) {
				if(request.status === 200 || request.status == 0) {
					data = JSON.parse(request.responseText);
				}
			}
		}
		request.send(null);
		
		return data;
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

		initClassAll();
	}

	function initClassAll() {
		classAll = new classHS('all');

		for (var className in classes)
			for (var rarity in classes[className].cards) {
				var cards = classes[className].cards[rarity];
				
				for (var cardName in cards)
					classAll.addCard(cards[cardName]);
			}

		sortCards('all');
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
		document.getElementById("link-recipes").addEventListener("click", displayRecipes);
		document.getElementById("link-news").addEventListener("click", displayNews);
		document.getElementById("link-about").addEventListener("click", displayAbout);
		document.getElementById("link-importHearthPwn").addEventListener("click", displayImportHearthPwn);
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
	
	function switchClassicPack() {
		var image = document.getElementById("imageClassicPack");
		
		if (!image.src.includes("golden")) {
			image.src = "images/pack_classic_golden.png";
			image.alt = "Golden Classic Pack";
			image.width = 157;
			
			var averageValue = calculatePackValue("classic", true);
		
			document.getElementById("classicAverageDust").innerHTML = (averageValue * 5).toFixed(1);
		}
		else {
			image.src = "images/pack_classic.png";
			image.alt = "Classic Pack";
			image.width = 160;
			
			var averageValue = calculatePackValue("classic");
		
			document.getElementById("classicAverageDust").innerHTML = (averageValue * 5).toFixed(1);
		}
	}
	
	// Initializes setsCards.
	// setsCards[set][rarity][className].cards = total cards
	// setsCards[set][rarity][className][quality] = craftable cards
	function initSetsCards() {
		setsCards = {};
		
		// Add the rarities to the set (to get them in the "correct" order)
		for (var set in setsEnum)
			setsCards[set] = { 	free: {},
								common: {},
								rare: {},
								epic: {},
								legendary: {}
			};
		
		// Loop through every card in the collection and add
		// the card's copies to its correct places
		for (var className in classes)
			for (var rarity in classes[className].cards)
				for (var cardName in classes[className].cards[rarity]) {
					var card = classes[className].cards[rarity][cardName];
					var set = card.set;		
					
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
		
		// Delete rarities not used in the set
		for (var set in setsEnum)
			for (var rarity in raritiesEnum)
				if (Object.keys(setsCards[set][rarity]).length == 0)
					delete(setsCards[set][rarity]);
		
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
		// ^ Not updated anymore.
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
			"Hall of Fame": setsEnum.hof,
			"Naxxramas": setsEnum.naxxramas,
			"Goblins vs Gnomes": setsEnum.gvg,
			"Blackrock Mountain": setsEnum.blackrock,
			"The Grand Tournament": setsEnum.tgt,
			"The League of Explorers": setsEnum.loe,
			"Whispers of the Old Gods": setsEnum.wotog,
			"One Night in Karazhan": setsEnum.onik,
			"Mean Streets of Gadgetzan": setsEnum.msog,
			"Journey to Un'Goro": setsEnum.ungoro,
			"Knights of the Frozen Throne": setsEnum.kotft,
			"Kobolds & Catacombs": setsEnum.kobolds,
			"The Witchwood": setsEnum.witchwood,
			"The Boomsday Project": setsEnum.boomsday,
			"Rastakhan's Rumble": setsEnum.rastakhan
		};
		
		var importCardData = function (cards, set) {
			cards.forEach(function (newCard) {
				if (!newCard.cardId.includes("HERO")) {
					var className = newCard.playerClass ? newCard.playerClass.toLowerCase() : classesEnum.neutral;
					var rarity = newCard.rarity.toLowerCase();
					
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
				} else { // Does not work
					console.log("ERROR: Unrecognized card set " + newCard.cardSet + ", skipping card " + newCard.name);
				}
			});
		}).fail(function() {
			importCardsOffline();
		});
	}
	
	// Imports cards from a local JSON-file
	function importCardsOffline() {
		var cardData = getData("all-collectibles");
		
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
	// Name: Lexicographical order
	function sortCards(className) {
		if (className == 'all')
			var cardList = classAll.cards;
		else
			var cardList = classes[className].cards;
		
		for (var rarity in cardList) {
			var sortedArray = [];
			for (var name in cardList[rarity])
				sortedArray.push([name, cardList[rarity][name]]);
			sortedArray.sort(function(a, b) {
			    return a[1].mana == b[1].mana ?
				a[1].name.localeCompare(b[1].name) :
				a[1].mana - b[1].mana;
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
		var rarity = element.parentNode.parentNode.getAttribute("class");
		
		for (var i = 1, len = list.length; i < len; i++) {
			var card;

			if (selectedClass == "all")
				card = classAll.cards[rarity][list[i].innerHTML];
			else card = classes[selectedClass].cards[rarity][list[i].innerHTML];

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
		var rarity = element.parentNode.parentNode.getAttribute("class");
		
		for (var i = 1, len = list.length; i < len; i++) {
			var card;

			if (selectedClass == "all")
				card = classAll.cards[rarity][list[i].innerHTML];
			else card = classes[selectedClass].cards[rarity][list[i].innerHTML];
			
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
		createClassTab = function (className) {
			var listItem = document.createElement("li");
			listItem.setAttribute("class", "col-xs-11ths nopadding");
			var listItemLink = document.createElement("a");
			var span = document.createElement("span");
			if (className in classes)
				span.innerHTML = classes[className].level; // Always level 1 for now
			else
				span.innerHTML = 1;
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

		createClassTab('all');
		
		for (var className in classes)
			createClassTab(className)

		div.appendChild(list);
	}
	
	// Currently only handles control of the filter list.
	// Display is done in HTML (should add it here)
	function displayFilterList() {		
		// Init left filter list (filter sets described in HTML)
		var filterListLeft = document.getElementById("filtersLeft").getElementsByTagName("a");
		for (var i = 0; i < filterListLeft.length; i++) {
			var filterListItem = filterListLeft[i];
			
			// Set the initial filter as selected
			if (filterBySet === filterListItem.innerHTML.toLowerCase()) {
				filterListItem.setAttribute("class", "selected");
				
				//  In case element is part of a dropdown-menu
				var dropdown = filterListItem.parentElement.
					parentElement.parentElement.childNodes[1];
					
				if (dropdown.getAttribute("data-toggle")) {
					dropdown.innerHTML = filterListItem.innerHTML + '<span class="caret"></span>';
					dropdown.setAttribute("class", "selected");
				}			
			}
			
			// Ignore clicks on the dropdown-menu itself
			if (filterListItem.getAttribute("data-toggle"))
				continue;
			
			// Closure function for when clicking on a filter
	        (function (filterListItem) {
			    filterListItem.addEventListener("click", function() {
					// Switch selected filter
					filterBySet = filterListItem.innerHTML.toLowerCase();
					
					// Deselect all other filters
					var filterListLeft = document.getElementById("filtersLeft").getElementsByTagName("a");
					for (var i = 0; i < filterListLeft.length; i++)
                      filterListLeft[i].removeAttribute("class");
				  
					//  In case element is part of a dropdown-menu
				    var dropdown = filterListItem.parentElement.
					    parentElement.parentElement.childNodes[1];
					
					if (dropdown.getAttribute("data-toggle")) {
						dropdown.innerHTML = filterListItem.innerHTML + '<span class="caret"></span>';
						dropdown.setAttribute("class", "selected");
					}
						
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
		if (className == 'all')
			var cardList = classAll.cards;
		else
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
			linkItemLink.setAttribute("class", "buttonAll noselect");
			linkItemLink.addEventListener("click", function() { addAll(this); });
			linkItemLink.addEventListener("contextmenu", function() { removeAll(this); });
			listItem.appendChild(linkItemLink);
			list.appendChild(listItem);
			
			// Fill in list_free with common cards instead
			if (rarity == "free" && settings.hideFreeCards) {
				document.getElementById("list_free").setAttribute("class", "common");
				continue;
			}

			// Loop through all cards in the collection of the selected class.
			// List is already sorted
			for (var name in cardList[rarity]) {
				var card = cardList[rarity][name];
				
				// Only display the card if it isn't filtered out
				if (isVisible(card, filterBySet, settings)) {
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
					
					// Split common cards in two lists if hideFreeCards is on
					if (rarity == "common" && settings.hideFreeCards) {
						if (document.getElementById("list_free").getElementsByTagName("li").length <= 
								document.getElementById("list_common").getElementsByTagName("li").length)
							document.getElementById("list_free").appendChild(listItem);
						else list.appendChild(listItem);
					}
					else list.appendChild(listItem);
				}
			}
		}

		function isVisible(card, filterBySet, settings) {
			// Only display the card if show missing cards is off,
			// or the card is actually missing from your collection
			if (settings.showOnlyMissingCards) {
				if (settings.excludeGoldenCards) {
					if (card.normal >= getMaxCopies(rarity)) {
						return false;
					}
				} else {
					if (card.normal >= getMaxCopies(rarity) && card.golden >= getMaxCopies(rarity)) {
						return false;
					}
				}
			}
			if (filterBySet === "all") {
				return true;
			}
			if (filterBySet === "standard") {
				return !!standardSetsEnum[card.set];
			}
			return card.set === filterBySet;
		}
	}

	function getMissingDataFiltered(classData) {
		if (filterBySet === "all") {
			return classData.total;
		} else if (filterBySet === "standard") {
			var missingData = {};
			for (var set in standardSetsEnum) {
				var setData = classData[set];
				for (var rarity in setData) {
					if (!missingData[rarity]) {
						missingData[rarity] = {
							normal: 0,
							golden: 0
						};
					}
					missingData[rarity].normal += setData[rarity].normal;
					missingData[rarity].golden += setData[rarity].golden;
				}
			}
			return missingData;
		} else {
			return classData[filterBySet];
		}
	}

	// Displays the missing cards data for the selected class
	function displayMissingCards() {
		document.getElementById("missingCardsClassTitle").innerHTML = selectedClass.toUpperCase();
		
		if (selectedClass == 'all')
			var missingData = getMissingDataFiltered(missingCards.overall);
		else
			var missingData = getMissingDataFiltered(missingCards.classes[selectedClass]);

		// Hide Free column if hideFreeCards is enabled
		var table = document.getElementById("missingCardsTable");
		for (var i = 0; i < 8; i += 2) {
			var element = table.childNodes[1].childNodes[i].childNodes[1];
			if (settings.hideFreeCards)
				element.style.display = "none";
			else element.style.display = "block";
		}
		
		for (var rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
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
		var missingData = getMissingDataFiltered(missingCards.overall);
		
		// Hide Free column if hideFreeCards is enabled
		var table = document.getElementById("missingCardsOverallTable");
		for (var i = 0; i < 8; i += 2) {
			var element = table.childNodes[1].childNodes[i].childNodes[1];
			if (settings.hideFreeCards)
				element.style.display = "none";
			else element.style.display = "block";
		}
		
		for (var rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
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
		if (selectedClass == 'all')
			var missingData = getMissingDataFiltered(missingDust.overall);
		else
			var missingData = getMissingDataFiltered(missingDust.classes[selectedClass]);

		for (var rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
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
		var missingData = getMissingDataFiltered(missingDust.overall);
		
		for (var rarity in missingData) {
			if (rarity == "free" && settings.hideFreeCards)
				continue;
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
	
	// Toggles the exclude golden cards setting and updates view
	function toggleHideFreeCards() {
		settings.hideFreeCards = !settings.hideFreeCards;
		
		if (document.getElementById("list_free").getAttribute("class") == "free")
			document.getElementById("list_free").setAttribute("class", "common");
		else document.getElementById("list_free").setAttribute("class", "free");
		
		localStorage.setItem("settings", JSON.stringify(settings));
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
	}	
	
	// Creates and returns a table representing a deck.
	// The deck should be an object of cards with this format:
	//     "card name": cardCopies
	//		...
	// Deck and class names are optional.
	function createDeckTable(deck, deckName, className) {
		var cardData = getData("all-collectibles");
		var currentDust = {
			normal: 0,
			golden: 0
		};
		var totalDust = {
			normal: 0,
			golden: 0
		};		
		
		var table = document.createElement("table");
		table.setAttribute("class", "tableDeck");
		
		// Create deck name row
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		td.setAttribute("class", "progress");
		td.setAttribute("colspan", 3);
		td.innerHTML = deckName || "Deck List";
		tr.appendChild(td);
		table.appendChild(tr);
		
		// Create card rows
		for (var cardName in deck) {
			var className = "";
			var rarity = "";
			//var image = "";
			
			// Get necessary card data
			for (var k = 0; k < cardData.cards.length; k++)
			    if (cardName == cardData.cards[k].name) {
					className = cardData.cards[k].hero;
					rarity = cardData.cards[k].quality;
					//image = cardData.cards[k].image_url;
					break;
				}
				
			var card = classes[className].cards[rarity][cardName];
			
			// Get card copies and dust owned/missing
			var copiesNormal = Math.min(card.normal, deck[cardName]);
			currentDust.normal += getCraftingCost(card, "normal", Math.min(card.normal, deck[cardName]));
			totalDust.normal += getCraftingCost(card, "normal", deck[cardName]);
			var copiesGolden = Math.min(card.golden, deck[cardName]);
			currentDust.golden += getCraftingCost(card, "golden", Math.min(card.golden, deck[cardName]));
			totalDust.golden += getCraftingCost(card, "golden", deck[cardName]);
			
			tr = document.createElement("tr");
			td = document.createElement("td");
			td.innerHTML = cardName;
			//td.style.background = "url('" + image + "') -70px -120px no-repeat";
			tr.appendChild(td);
			td = document.createElement("td");
			td.setAttribute("class", "normal");
			td.innerHTML = copiesNormal + "/" + deck[cardName];
			tr.appendChild(td);
			if (!settings.excludeGoldenCards) {
				td = document.createElement("td");
				td.setAttribute("class", "golden");
				td.innerHTML = copiesGolden + "/" + deck[cardName];
				tr.appendChild(td);
			}
			table.appendChild(tr);
		}
		
		// Create dust and progress row
		tr = document.createElement("tr");
		td = document.createElement("td");
		td.setAttribute("class", "progress");
		if (!settings.excludeGoldenCards)
			td.innerHTML =  Math.floor((currentDust.normal + currentDust.golden) 
				/ (totalDust.normal + totalDust.golden) * 100) + "%";
		else td.innerHTML =  Math.floor(currentDust.normal / totalDust.normal * 100) + "%";
		tr.appendChild(td);
		td = document.createElement("td");
		td.setAttribute("class", "dust");
		td.innerHTML = totalDust.normal - currentDust.normal;
		tr.appendChild(td);
		if (!settings.excludeGoldenCards) {
			td = document.createElement("td");
			td.setAttribute("class", "dust");
			td.innerHTML = totalDust.golden - currentDust.golden;
			tr.appendChild(td);
		}
		table.appendChild(tr);
		
		return table;
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
		var setList = {};
		if (set !== "standard")
	        setList[set] = set;
		else setList = standardSetsEnum;
		
		var rarities = {};
		for (var cardSet in setList)
			for (var rarity in setsCards[cardSet])
			    if (rarities[rarity] == undefined)
					rarities[rarity] = rarity;

		// Don't display an "all" column for sets only containing one rarity
		if (Object.keys(rarities).length != 1)
		    rarities.all = "all";
		
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
		for (var rarity in rarities) {
			if (rarity == "free" && settings.hideFreeCards &&
   			    (set == "standard" || set == "total"))
				continue;
		    td = document.createElement("td");
		    td.innerHTML = capitalizeFirstLetter(rarity);
		    tr.appendChild(td);
		    tr.appendChild(document.createElement("td"));
		}
		
		table.appendChild(tr);
		
		// Create the class rows
		for (var className in classesEnum) {
			table.appendChild(createProgressTableRow("normal", setList, rarities, className));
			// Exclude golden data if the setting is on
			if (!settings.excludeGoldenCards)
			    table.appendChild(createProgressTableRow("golden", setList, rarities, className));
		}
		// Create the total rows
		table.appendChild(createProgressTableRow("normal", setList, rarities, "total"));
		if (!settings.excludeGoldenCards)
		    table.appendChild(createProgressTableRow("golden", setList, rarities, "total"));
		
		return table;
	}
	
	// Creates and returns a progress table row
	function createProgressTableRow(quality, sets, rarities, className) {
		var data = createProgressData(quality, sets, className);
		
		var tr = document.createElement("tr");
		tr.setAttribute("class", className);
		var td = document.createElement("td");
		
		// Only display the class name on the first (normal) row
		if (quality == "normal")
		    td.innerHTML = capitalizeFirstLetter(className);
		
		tr.appendChild(td);
		
		// Create data for all rarities
		for (var rarity in rarities) {
			if (rarity == "free" && settings.hideFreeCards &&
			    (sets == standardSetsEnum || sets.hasOwnProperty("total")))
				continue;
			// Create the card data
		    var td = document.createElement("td");
			var text = "-";
			var totalCards = data.totalCards[rarity];
			var missingCards = data.missingCards[rarity];

			// If there are collectible cards for this class/set/rarity
			if (totalCards != 0) {
				// Example: 0/50 (0%)
				text = totalCards - missingCards + "/" + totalCards +
				   	   " (" + Math.floor(((totalCards - missingCards) / totalCards) * 100) + "%)";
			
			}
		    td.innerHTML = text;
			tr.appendChild(td);
			
			// Create the dust data
			td = document.createElement("td");
			
			// If no collectible cards for this class/set/rarity or if they're uncraftable
			if (data.totalDust[rarity] == 0)
					text = "-";
			else {
				var totalDust = data.totalDust[rarity];
				var currentDust = totalDust - data.missingDust[rarity];
				// No need to display % here as it's the same as the card data %
				if (rarity !== "all")
                    text = " " + currentDust + "/" + totalDust;
				// But when combining rarities, display the %
				else text = " " + currentDust + "/" + totalDust +
				   " (" + Math.floor((currentDust / totalDust) * 100) + "%)";
			}
			td.innerHTML = text;
			tr.appendChild(td);
		}
		
		return tr;
	}
	/*********************************************************
	************************PACK GUIDE************************
	*********************************************************/
	// Displays the dust values for every pack
	function updatePackGuide() {
		var averageValue = 0;
		for (var set in packsEnum) {
			averageValue = calculatePackValue(set);
			
		    document.getElementById(set + "AverageDust").innerHTML = (averageValue * 5).toFixed(1);
		}
	}
	
	// Calculates and returns the dust value for a pack.
	// golden: True if pack is golden.
	// Needs more commenting
	function calculatePackValue(set, golden) {
		var averageValue = 0;
		
	    for (var rarity in chanceOfGetting) {
			// Value for guaranteed legendary, when any is missing (not 100% accurate)
			if (rarity == "legendary" && missingCards.overall[set][rarity].normal > 0 && missingCards.overall[set][rarity].golden > 0) {
				if (!golden) {
					averageValue += chanceOfGetting[rarity].normal * craftingCost[rarity].normal;
					if (!settings.excludeGoldenCards)
						averageValue += chanceOfGetting[rarity].golden * craftingCost[rarity].golden;
					else averageValue += chanceOfGetting[rarity].golden * disenchantmentValue[rarity].golden;
				}
				else {
					if (!settings.excludeGoldenCards)
						averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * craftingCost[rarity].golden;
					else averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * disenchantmentValue[rarity].golden;
				}
				continue;
			}
				
			var dupesNormal = 0, dupesGolden = 0;
			var totalCards = setsCards[set][rarity].total.cards / getMaxCopies(rarity);

			for (var className in classesEnum)
				for (var cardName in classes[className].cards[rarity]) {
					var card = classes[className].cards[rarity][cardName];
					
					if (card.set == set) {
						if (card.normal == getMaxCopies(rarity))
							dupesNormal++;
						if (card.golden == getMaxCopies(rarity))
							dupesGolden++;
					}
				}
			
			if (!golden) {
				averageValue += chanceOfGetting[rarity].normal * ((dupesNormal / totalCards) * disenchantmentValue[rarity].normal
					+ ((totalCards - dupesNormal) / totalCards) * craftingCost[rarity].normal);
				if (!settings.excludeGoldenCards)
					averageValue += chanceOfGetting[rarity].golden * ((dupesGolden / totalCards) * disenchantmentValue[rarity].golden
						+ ((totalCards - dupesGolden) / totalCards) * craftingCost[rarity].golden);
				else averageValue += chanceOfGetting[rarity].golden * disenchantmentValue[rarity].golden;
			}
			else {
				if (!settings.excludeGoldenCards)
					averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * ((dupesGolden / totalCards) * disenchantmentValue[rarity].golden
						+ ((totalCards - dupesGolden) / totalCards) * craftingCost[rarity].golden);
				else averageValue += (chanceOfGetting[rarity].normal + chanceOfGetting[rarity].golden) * disenchantmentValue[rarity].golden;
			}
		}
		return averageValue;
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
		
		var dupes = {
			common: 0,
			rare: 0,
			epic: 0
		};
		
		for (var set in rewardsEnum) {
		    for (var rarity in averageDust) {
				total[rarity] += setsCards[set][rarity].total.cards / getMaxCopies(rarity);
				
				for (var className in classesEnum)
					for (var cardName in classes[className].cards[rarity]) {
						var card = classes[className].cards[rarity][cardName];
						
						if (card.set == set)
							if (card.golden == getMaxCopies(rarity))
								dupes[rarity]++;
					}	
			}
		}
		
		for (var rarity in averageDust) {
		    if (!settings.excludeGoldenCards)
			    averageDust[rarity] += (dupes[rarity] / total[rarity]) * disenchantmentValue[rarity].golden
		            + ((total[rarity] - dupes[rarity]) / total[rarity]) * craftingCost[rarity].golden;
		    else averageDust[rarity] = disenchantmentValue[rarity].golden;
		}
		
		document.getElementById("chest20AverageDust").innerHTML = (averageDust.common + 5).toFixed(1);
		document.getElementById("chest15AverageDust").innerHTML = (averageDust.common + averageDust.rare + 5).toFixed(1);
		document.getElementById("chest10AverageDust").innerHTML = (averageDust.common * 2 + averageDust.rare + 5).toFixed(1);
		document.getElementById("chest5AverageDust").innerHTML = (averageDust.common * 2 + averageDust.epic + 5).toFixed(1);
		document.getElementById("chestLegendaryAverageDust").innerHTML = (averageDust.common * 3 + averageDust.epic).toFixed(1);
	}
	/*********************************************************
	**********************DECK RECIPES************************
	*********************************************************/
	// Displays deck recipes for the selected class in the drop-down list
	function displayDeckRecipes(evt) {
		var className = document.getElementById('selectRecipes').value;
		
		// Function is invoked by code when accessing the recipes page,
		// but otherwise the tables need to be removed each time a new
		// class is selected.
		if (evt != undefined) {
		    document.getElementById("containerRow").childNodes[1].removeChild(
		        document.getElementById("containerRow").childNodes[1].lastChild);
		}
		
		var recipes = getData("deck-recipes");
		
		var side = document.getElementsByClassName("side-page")[0];

		var div = document.createElement("div");
		div.setAttribute("class", "mainDiv");
		var div2 = document.createElement("div");
		div2.setAttribute("class", "row");
		for (var i = 0; i < recipes[className].length; i++) {
		    var div3 = document.createElement("div");
		    div3.setAttribute("class", "col-xs-4");
		    div3.appendChild(createDeckTable(recipes[className][i].deck,
			    recipes[className][i].name));
		    div2.appendChild(div3);
		}
		div.appendChild(div2);
		side.appendChild(div);
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
		
		document.getElementById("imageClassicPack").addEventListener("click", switchClassicPack);
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayRecipes() {
		var template = document.getElementById("template-recipes").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
			
		// Add an event listener to the drop-down list that will display deck recipes
		document.getElementById('selectRecipes').addEventListener('change', displayDeckRecipes);
		
		displayDeckRecipes();
		
		document.getElementById("header-center").style.visibility = "hidden";
		
		document.oncontextmenu = function() {
            return true;
        }
	}
	
	function displayTracker() {
		var template = document.getElementById("template-tracker").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		displayClassTabs();
		displayFilterList();
		displayCards(selectedClass);
		displayMissingCards();
		displayMissingCardsOverall();
		displayMissingDust();
		displayMissingDustOverall();
		
		document.getElementById("checkboxGolden").addEventListener("change", toggleGoldenCards);
		document.getElementById("checkboxGolden").checked = settings.excludeGoldenCards;
		
		document.getElementById("checkboxHideFreeCards").addEventListener("change", toggleHideFreeCards);
		document.getElementById("checkboxHideFreeCards").checked = settings.hideFreeCards;
		
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
	
	function displayImportHearthPwn() {
		var template = document.getElementById("template-importHearthPwn").innerHTML;
		document.getElementById("containerRow").innerHTML = template;
		
		// Add an event listener to the submit form
		document.getElementById('formImportHearthPwn').addEventListener('submit', importHearthPwn);
		
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
	
	// Imports a collection from HearthPwn.
	// Event = formImportHearthPwn onsubmit
	function importHearthPwn(evt) {
		evt.preventDefault();
		
		document.getElementById('importHearthPwnStatus').innerHTML =
		    "Please wait...";
		
		var username = evt.target["username"].value;
		var cardIds = getData("card-ids");
		var cardData = getData("all-collectibles");
				
		fetch('https://cors-anywhere.herokuapp.com/http://www.hearthpwn.com/members/' + username + '/collection', { mode: 'cors'})
			.then(response => response.text())
			.then(data => {
				var normalizedData = cheerio.load(data, {
					normalizeWhitespace: true
				});
				var ownedCards = normalizedData('div.owns-card');


				ownedCards.each(function(i, element)
				{
					var externalID = element.attribs["data-id"];
					var name = "";
					var className = "";
					var rarity = "";
					var copies = 0;
					var quality = "";
				
					// Get the name of the card by matching HearthPwn ids.
					// Can grab name from HTML, but may contain odd symbols
					for (var j = 0; j < cardIds.length; j++)
						if (externalID == cardIds[j].hpid) {
							name = cardIds[j].name;
							break;
						}
				
					// Get other necessary card data
					for (var k = 0; k < cardData.cards.length; k++)
						if (name == cardData.cards[k].name) {
							className = cardData.cards[k].hero;
							rarity = cardData.cards[k].quality;
							break;
						}
				
					// Get the quality and the amount of copies
					if (element.attribs["data-is-gold"] == "False") {
						quality = "normal";
					}
					else {
						quality = "golden";
					}
					
					copies = Math.min(element.children[1].children[3].attribs["data-card-count"], getMaxCopies(rarity));

					// Add the card info to HSCT
				    if (name != "" && className != "") {
						var card = classes[className].cards[rarity][name];
						
						if(!card) {
							console.error('Could not add card', {
								name, className, rarity, copies, quality
							})
						}
						else {
							updateCard(card, quality, copies);
						}

					}
				});
				
				document.getElementById('importHearthPwnStatus').innerHTML =
				    "Collection imported successfully";
					
				updateLocalStorage();

			});

		// Get the collection data
		// YUI().use('yql', function(Y) {
		// 	Y.YQL('select * from htmlstring where ' +
		// 	    'url="http://www.hearthpwn.com/members/' + username + '/collection" ' +
		// 	    'and xpath="//div[contains(@class, \'owns-card\')]"', function(r) {
				
		// 		console.log(r);
				
		// 		try {
		// 			// Error finding collection
		// 			if (r.query.results.result == "") {
		// 				document.getElementById('importHearthPwnStatus').innerHTML =
		// 					"Wrong username or collection set to private";
		// 				return;
		// 			}
		// 		}
		// 		catch(e) {
		// 			document.getElementById('importHearthPwnStatus').innerHTML =
		// 				"Importing failed. Try editing and saving collection on HearthPwn again";
		// 			return;
		// 		}
				
		// 		initCollection();
				
		// 		// Trim HTML source and convert to JSON
		// 		var html = r.query.results.result.replace(/&#13;/g, '');
		// 		html = html.replace(/\n/ig, '');
		// 		html = html.replace(/\s\s+/g, '');
				
		// 		}, {
		// 	    format: 'json',
		// 		env: 'store://datatables.org/alltableswithkeys'
		// 		}, {
		// 		base: '://query.yahooapis.com/v1/public/yql?', //Different base URL for private data
		// 		proto: 'https' //Connect using SSL
		// 	});
		// });
	}
	/*********************************************************
	***********************MAIN FUNCTION**********************
	*********************************************************/
	return {
		init: function() {
			//console.log(JSON.stringify(localStorage).length);
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
				else {
					loadLocalStorage();
					initClassAll();
				}
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