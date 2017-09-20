var gbApp = angular.module('gbApp', ['ui.router','ngSanitize','ngStorage']);

// Set up states (different url pages)
gbApp.config(function($stateProvider, $urlRouterProvider) {

  $urlRouterProvider.otherwise("main");

  $stateProvider
    .state("main", {
      url: "/main",
      templateUrl: "templates/main.html"
    })
    .state("clamp", {
      url: "/clamp:label",
      templateUrl: "templates/clamp_selection.html",
      controller: function($scope, $stateParams) {
      	if($stateParams.label) $scope.label = $stateParams.label;
      }
    })
    .state("checkout", {
      url: "/checkout",
      templateUrl: "templates/checkout.html"
    })
    .state("thankyou", {
      url: "/thankyou",
      templateUrl: "templates/thankyou.html"
    })
});

// Custom filter to order an object
gbApp.filter('orderObjectBy', function() {
  return function(items, field, reverse) {
    var filtered = [];
    angular.forEach(items, function(item) {
      filtered.push(item);
    });
    filtered.sort(function (a, b) {
      return (a[field] > b[field] ? 1 : -1);
    });
    if(reverse) filtered.reverse();
    return filtered;
  };
});

// Custom filter to filter list of clamps to specified type
gbApp.filter('matchClampType', function() {
  return function(items, type, currentWire) {
    var filtered = [];
    angular.forEach(items, function(item) {
      if(type == item.type) {
      	if(item.incompatible_wires == undefined || item.incompatible_wires.indexOf(currentWire) == -1){
        	filtered.push(item);
        }
      }
    });
    return filtered;
  };
});

// Custom filter to filter consolidated product list to specified attribute
gbApp.filter('matchAttribute', function() {
  return function(items, key, value) {
  	
    var filtered = [];
    angular.forEach(items, function(item) {
      if(item[key] == value) {
         filtered.push(item);
      }
    });
    return filtered;
  };
});

// Custom filter to filter list of accessories based on an item's product number
gbApp.filter('matchclamp_accessoryCompatibility', function() {
  return function(items, clamp_accessory) {
    var filtered = [];
    angular.forEach(items, function(item) {
      if($scope.inArray(item.type, item[clamp_accessory+"_compatibility"])) {
    		filtered.push(item);
      }
    });
    return filtered;
  };
});

// Main controller
gbApp.controller('gbCtrl', function($scope, $location, $http, $state, $filter, $localStorage, $anchorScroll) {

	// Access localstorage
	$scope.$storage = $localStorage;
	
	// Basic unset product model
	$scope.productModel = {
				"clamp": {
					"a": {
					},
					"b": {
					}
				},
				"groundset_qty": 1,
				"bag_qty": 0,
				"cleaner_qty": 0,
				"tax": 0
			};
		
	// Functions
	
	// Init: function that runs on initial load	
	$scope.init = function(){ // Initial action: Load the data structure that will drive the app.
	
		// Set up default model for storing chosen values
		if(!$scope.$storage.product){
			$scope.$storage.product = angular.copy($scope.productModel)
		}
		
		// Object to hold current view parameters -- do not need to be sent with product
		if(!$scope.current){
			$scope.current = {};
		}

		// Initialize progress num and max progress num or increment progress based on progress already made (pre-reload)
		if($scope.$storage.product && $scope.$storage.product.clamp && $scope.$storage.product.clamp['b'] && $scope.$storage.product.clamp['b'].productnum){
			$scope.progressNum = 4;
			$scope.maxProgressNum = 4;
		}
		else if($scope.$storage.product && $scope.$storage.product.clamp && $scope.$storage.product.clamp['a'] && $scope.$storage.product.clamp['a'].productnum){
			$scope.progressNum = 2;
			$scope.maxProgressNum = 2;
		}
		else {
			$scope.progressNum = 1;
			$scope.maxProgressNum = 2;		
		}
		
		// Initialize wire hover variable
		$scope.wire_hover = '';
		
		// Initialize error string
		$scope.error = "";

				
		// Some jury-rigging to find the relative location
		var urlpath = window.location.href;
		urlpath = urlpath.replace("#/","");
		urlpath = urlpath.substr(0,urlpath.lastIndexOf('/'));
		console.log(urlpath+'/json/options.json');
		
		if(!$scope.$storage.options){
			$http({
		    	url: urlpath+'/json/options.json',
		    	dataType: 'json',
		    	method: 'POST',
		    	data: { test: 'test' },
		    	headers: {
		        	"Content-Type": "application/json"
		        }
		    })
	  		.success(function(data, status, headers, config) {
				$scope.$storage.options = data.ground_builder;
				$scope.consolidateProduct();
	  		})
	  		.error(function(){
	  			console.log("Error loading options");
	  		});
	  	}
	  	else{
	  		$scope.consolidateProduct();
	  	}
	};
	
	// inArray support function: needle, haystack
	$scope.inArray = function(needle, haystack){
		var ret = false; 
		
		angular.forEach(haystack, function(v, k){
			if(!ret){
				if(v == needle){
					ret = true;
				}
				
				// also check keys
				if(k == needle && v == true){
					ret = true;
				}
			}
		});
		
		return ret;
	};
	
	// arrayKeys support function: returns the keys of an array; if no keys, return vals
	$scope.arrayKeys = function(arr){
		var filtered = [];
	
		angular.forEach(arr, function(v, k){
			filtered.push(k);
		});
		
		return filtered;
	}

	// toTitleCase: returns string with first letter capitalized
	$scope.toTitleCase = function (str) {
    	return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	};
	
	// emptyOrNull support function: return true if array is empty or null.
	$scope.emptyOrNull = function(arr){
		var ret = true;

		if(!arr) return true;
		if(angular.equals([],arr)) return true;
		if(angular.equals({},arr)) return true;

		// Go through and make sure all the values are not 'false'
		angular.forEach(arr, function(v,k){
			if(ret){
				if(v){
					ret = false;
				}
			}
		});

		return ret;
	};
	
	// nullif: return the second value if the first value is null
	$scope.nullif = function(test, fallback){
		if(test == undefined || test == null){
			return fallback;
		}
		return test;
	};
	
	// objectAsNum: return the object parsed as a number, if it's a number; 0, if it's null or NaN
	$scope.objectAsNum = function(obj){
		obj = parseInt(obj);
		
		if(isNaN(obj)){
			return 0;
		}
		
		return $scope.nullif(obj, 0);
	};
	
	// Function enabling toggle on/off of radio button
	$scope.toggleValue = function(onval, model){
		if(model == onval) return false;
		else return onval;
	};
	
	// Scroll to anchor
	$scope.scrollTo = function(id) {
      $location.hash(id);
      $anchorScroll();
   };
	
	// Set progress num when you click on a doable section, or increment it when you finish a section.
	$scope.setProgressNum = function(num){
		if(num <= $scope.maxProgressNum && num > $scope.progressNum){
			$scope.progressNum = num;
		}
	};
	
	// When you finish one section, enable and advance to the next.
	$scope.finishSection = function(num){
		if($scope.maxProgressNum <= $scope.progressNum){
			$scope.maxProgressNum = $scope.progressNum;
		}
		$scope.setProgressNum(num + 1);
	};
	
	// Test if you should go to clamp, then do or don't
	$scope.testGotoClamp = function(label){
		if(label == 'b' && $scope.maxProgressNum < 3){
			return false;
		}
		else{
			$scope.gotoClamp(label);
		}
	};
	
	// Reset template
	$scope.resetProduct = function(){
		$scope.$storage.product = angular.copy($scope.productModel);
		$scope.consolidateProduct();
	};
	
	// Go to clamp page
	$scope.gotoClamp = function(label){
		var params = { "label": label };
		$scope.error = "";
		
		if(label == 'a'){
			$scope.setProgressNum(2);
		}
		if(label == 'b'){
			if($scope.emptyOrNull($scope.$storage.product.clamp['b'])){ // If clamp b has nothing in it yet, set it to clamp a.
				$scope.$storage.product.clamp['b'] = angular.copy($scope.$storage.product.clamp['a']); 
			}
			params["#"] = "top";
			$scope.maxProgressNum = 4;
			$scope.setProgressNum(4);
		}
		
		$state.go("clamp", params);
	};
	
	// Finish clamps
	$scope.finishClamps = function(label){
		$scope.consolidateProduct();
		$state.go("main",{"#":"bottom"});
	};

	// Upon selecting a clamp accessory type, change the view (if checking; do nothing if unchecking)
	$scope.setCurrentAccessoryType = function(acctype){
		$scope.current.accessory_type = acctype;
		$scope.scrollTo("clamp_accessory_select");
	};
	
	// Upon selecting a clamp, set the equipment that is based on that
	$scope.clampSelect = function(productnum, label){
	
		var clamp = $scope.$storage.options.clamp[productnum];

		// clear accessories
		delete $scope.$storage.product.clamp[label].clamp_accessory;
		
		// jump to next section
		$scope.scrollTo("clamp_accessory_type_select");
		
	};
	
	// Determine if clamp section is finished
	$scope.clampSectionFinished = function(label){
		
		if($scope.$storage.product
			&& $scope.$storage.product.clamp
			&& $scope.$storage.product.clamp[label]
			&& $scope.$storage.product.clamp[label].productnum){ // Clamp product number must be chosen.
				return true;
			}
			
		// Got through without meeting conditions
		return false;
	};

	// Go to checkout page, if possible
	$scope.gotoCheckout = function(){
	
		if(!$scope.$storage.product.wire){
			$scope.error = "Wire must be selected.";
			return false;
		}
		else if(!$scope.$storage.product.wire_color){
			$scope.error = "Wire color must be selected.";
			return false;
		}
		else if(!$scope.$storage.product.wire_length || isNaN($scope.$storage.product.wire_length) || $scope.$storage.product.wire_length <= 0){
			$scope.error = "Wire length must be a number greater than 0.";
			return false;
		}
		else if(!$scope.clampSectionFinished('a')){
			if(!$scope.clampSectionFinished('b')){
				$scope.error = "Clamps must be selected.";
				return false;
			}
			else {
				$scope.error = "Clamp A must be selected.";
				return false;
			}
		}
		else if(!$scope.clampSectionFinished('b')){
			$scope.error = "Clamp B must be selected.";
			return false;
		}
		else {
			$scope.error = "";
			$state.go("checkout");
		}
	};
	
	// Submit and go to thank you page, if possible
	$scope.gotoThankyou = function(messageName,messageEmail,messagePhone,messageComments){
		if(!messageEmail){
			$scope.error = "Please enter a valid email address.";
			return false;
		}
		else{
			$scope.messageSubmit(messageName,messageEmail,messagePhone,messageComments);
			$state.go("thankyou");
		}
	}

	// Get Price for Wire
	$scope.getPriceWire = function(){
		var price = 0;
		
		if($scope.$storage.options
			&& $scope.$storage.options.wire
			&& $scope.$storage.product.wire
			&& $scope.$storage.options.wire[$scope.$storage.product.wire]
			&& $scope.$storage.options.wire[$scope.$storage.product.wire].colors
			&& $scope.$storage.product.wire_color
			&& $scope.$storage.options.wire[$scope.$storage.product.wire].colors[$scope.$storage.product.wire_color]
			&& $scope.$storage.product.wire_length){
				price = $scope.$storage.options.wire[$scope.$storage.product.wire].colors[$scope.$storage.product.wire_color] * $scope.$storage.product.wire_length;
				$scope.finishSection(1); // Finish the section one I'm able to do this
			}
		
		return price;
	};
	
	// Get Price for Clamp - without accessories
	$scope.getPriceClamp = function(label){
		var price = 0;
		
		if($scope.$storage.product.clamp[label].productnum){
			var clampnum = $scope.$storage.product.clamp[label].productnum;
			price += $scope.$storage.options.clamp[clampnum].price;
		}
		
		return price;
	};
	
	// Get price for Clamp Accessory
	$scope.getPriceClampAccessory = function(){
		var price = 0;
		
		$scope.consolidateProduct();
		angular.forEach($scope.consolidatedAccessories, function(acc,productnum){
			price += acc.quantity * acc.unitprice;
		});
		
		return price;
	}
	
	// Get price for Extra Items - Ferrule, Strain Relief
	$scope.getPriceItem = function(itemtype, label){
		var price = 0;
		
		if($scope.$storage.product.clamp[label]
			&& $scope.$storage.product.clamp[label][itemtype]){
				price += $scope.$storage.product.clamp[label][itemtype].price;
		}
		
		return price;
	}
	
	// GetPriceGroundset -- get the total price of all groundsets
	$scope.getPriceGroundset = function(){
		var price = 0;
		var gsprice = 0;
		
		angular.forEach($scope.$storage.options.groundset,function(v,k){
			gsprice += v.unitprice * v.quantity;
		});
		
		price = $scope.$storage.product.groundset_qty * gsprice;
		
		return price;
	};
	
	// GetPriceBag -- get the total price of storage bags
	$scope.getPriceBag = function(){
		var price = 0;
		if($scope.$storage.product.bag_qty){
			price += $scope.$storage.product.bag_qty * $scope.$storage.options.storage_bag.unitprice;
		}
		return price;
	};
		
	$scope.getTax = function(){
		
		// 6% for Pennsylvania
		if(parseInt($scope.$storage.product.zipcode) > 15000 && parseInt($scope.$storage.product.zipcode) <= 19640){
			var price = $scope.getPriceTotal();
			$scope.$storage.product.tax = price * 0.06;
		}
		else{
			$scope.$storage.product.tax = 0;
		}
		
		return $scope.$storage.product.tax;
	}
	
	// Decide whether to disable a wire color
	$scope.disableWireColor = function(color){
		ret = false;
		
		if($scope.$storage.options.wire
			&& $scope.$storage.product.wire
			&& $scope.$storage.options.wire[$scope.$storage.product.wire]){
				
				if(!$scope.$storage.options.wire[$scope.$storage.product.wire].colors){
					ret = true;
				}
				else if($scope.$storage.options.wire[$scope.$storage.product.wire].colors[color]){
					ret = false;
				}
				else{
					ret = true;
				}
			}
			
		return ret;
	};
	
	// Increment or decrement a general product qty -- for bag, cleaner, or formerly groundset
	$scope.increment = function(tag){
		$scope.$storage.product[tag]++;
		$scope.consolidateProduct();
	};
	$scope.decrement = function(tag){
		$scope.$storage.product[tag]--;
		$scope.consolidateProduct();
	};

	// Increment or decrement a clamp accessory
	$scope.increment_accessory = function(label,acctype, accnum){
		if(!$scope.$storage.product.clamp[label].clamp_accessory) $scope.$storage.product.clamp[label].clamp_accessory = {};
		if(!$scope.$storage.product.clamp[label].clamp_accessory[acctype]) $scope.$storage.product.clamp[label].clamp_accessory[acctype] = {};

		if($scope.$storage.product.clamp[label].clamp_accessory[acctype][accnum]){
			$scope.$storage.product.clamp[label].clamp_accessory[acctype][accnum]++;
		}
		else{
			$scope.$storage.product.clamp[label].clamp_accessory[acctype][accnum] = 1;
		}
		$scope.consolidateProduct();
	};
	$scope.decrement_accessory = function(label, acctype, accnum){
		if(!$scope.$storage.product.clamp[label].clamp_accessory) $scope.$storage.product.clamp[label].clamp_accessory = {};
		if(!$scope.$storage.product.clamp[label].clamp_accessory[acctype]) $scope.$storage.product.clamp[label].clamp_accessory[acctype] = {};

		if($scope.$storage.product.clamp[label].clamp_accessory[acctype][accnum]){
			$scope.$storage.product.clamp[label].clamp_accessory[acctype][accnum]--;
		}
		else{
			$scope.$storage.product.clamp[label].clamp_accessory[acctype][accnum] = 0;
		}
		$scope.consolidateProduct();
	};
	
	// Consolidate the product into a simple array
	$scope.consolidateProduct = function(){
	
		//if(!$scope.$storage.consolidatedProduct){
			$scope.$storage.consolidatedProduct = { "line_item": { "groundset": {}, "accessory": {} }, "subtotal": 0, "tax": 0, "shipping": 0, "total": 0 };
		//}
		
		// Wire
		if($scope.$storage.product.wire){
			if(!$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire]){
				$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire] = {};
			}

			$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire].productnum = $scope.$storage.product.wire;
			$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire].type = "wire";
			if($scope.$storage.product.wire_length) $scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire].quantity = $scope.$storage.product.wire_length;
			if($scope.$storage.product.wire_color){
				$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire].text = $scope.$storage.product.wire+" Wire - "+$scope.$storage.product.wire_color;
				$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.wire].unitprice = $scope.$storage.options.wire[$scope.$storage.product.wire].colors[$scope.$storage.product.wire_color];
			}
		}
		
		// Clamp and associated parts
		if($scope.$storage.product.clamp['a'].productnum){
			$scope.addProducttoConsolidation("groundset", "clamp", "clamp", $scope.$storage.product.clamp['a'].productnum, 1);
			
			// Identify and add the ferrule
			var ferrulenuma = $scope.getFerruleNum($scope.$storage.product.wire, $scope.$storage.product.clamp['a'].productnum);
			if(ferrulenuma) $scope.addProducttoConsolidation("groundset", "ferrule", "clamp_accessory", ferrulenuma, 1);
			
			// Identify and add the strain relief
			var srnuma = $scope.getStrainReliefNum($scope.$storage.product.clamp['a'].productnum);
			if(srnuma) $scope.addProducttoConsolidation("groundset", "strain_relief", "clamp_accessory", srnuma, 1);
		}
		if($scope.$storage.product.clamp['b'].productnum){
			if($scope.$storage.product.clamp['a'].productnum && $scope.$storage.product.clamp['a'].productnum == $scope.$storage.product.clamp['b'].productnum){
				$scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.clamp['a'].productnum].quantity = 2;
				if(ferrulenuma) $scope.$storage.consolidatedProduct.line_item.groundset[ferrulenuma].quantity = 2;
				if(srnuma) $scope.$storage.consolidatedProduct.line_item.groundset[$scope.$storage.product.clamp['a'].strain_relief.productnum].quantity = 2;
			}
			else{
				$scope.addProducttoConsolidation("groundset", "clamp", "clamp", $scope.$storage.product.clamp['b'].productnum, 1);
				
				// Identify and add the ferrule
				var ferrulenumb = $scope.getFerruleNum($scope.$storage.product.wire, $scope.$storage.product.clamp['b'].productnum);	
				if(ferrulenumb){
					if(ferrulenuma && ferrulenumb == ferrulenuma){
						$scope.$storage.consolidatedProduct.line_item.groundset[ferrulenuma].quantity = 2;
					}
					else{
						$scope.addProducttoConsolidation("groundset", "ferrule", "clamp_accessory", ferrulenumb, 1);
					}
				}
				
				// Identify and add the strain relief
				var srnumb = $scope.getStrainReliefNum($scope.$storage.product.clamp['b'].productnum);
				if(srnumb){
					if(srnuma && srnumb == srnuma){
						$scope.$storage.consolidatedProduct.line_item.groundset[srnuma].quantity = 2;
					}
					else{
						$scope.addProducttoConsolidation("groundset", "strain_relief", "clamp_accessory", srnumb, 1);
					}
				}
			}
		}

		// Accessory
		angular.forEach(['a','b'], function(label){
			if($scope.$storage.product.clamp[label].clamp_accessory){
				angular.forEach($scope.$storage.options.clamp_accessory_type, function(accinfo, acctype){
					if($scope.$storage.product.clamp[label].clamp_accessory[acctype]){
						if(accinfo.mode == 'radio'){
							$scope.addProducttoConsolidation("accessory", "clamp_accessory", "clamp_accessory", $scope.$storage.product.clamp[label].clamp_accessory[acctype], 1);
						}
						else if(accinfo.mode == 'checkbox'){
							angular.forEach($scope.$storage.product.clamp[label].clamp_accessory[acctype], function(v,k){
								$scope.addProducttoConsolidation("accessory", "clamp_accessory", "clamp_accessory", k, 1);
							});
						}
						else if(accinfo.mode == 'stepper'){
							angular.forEach($scope.$storage.product.clamp[label].clamp_accessory[acctype], function(v,k){
								$scope.addProducttoConsolidation("accessory", "clamp_accessory", "clamp_accessory", k, v);
							});
						}
					}
				});
			}
		});

		// Bag
		if($scope.$storage.product.bag_qty && $scope.$storage.options.storage_bag.productnum){
			if(!$scope.$storage.consolidatedProduct.line_item.accessory[$scope.$storage.options.storage_bag.productnum]){
				$scope.$storage.consolidatedProduct.line_item.accessory[$scope.$storage.options.storage_bag.productnum] = {
					 "productnum": $scope.$storage.options.storage_bag.productnum,
					 "type": "storage_bag",
					 "text": $scope.$storage.options.storage_bag.text,
					 "unitprice": $scope.$storage.options.storage_bag.unitprice,
					};
			};
			$scope.$storage.consolidatedProduct.line_item.accessory[$scope.$storage.options.storage_bag.productnum].quantity = $scope.$storage.product.bag_qty;
		}

		// Cleaner
		if($scope.$storage.product.cleaner_qty && $scope.$storage.options.cleaner.productnum){
			if(!$scope.$storage.consolidatedProduct.line_item.accessory[$scope.$storage.options.cleaner.productnum]){
				$scope.$storage.consolidatedProduct.line_item.accessory[$scope.$storage.options.cleaner.productnum] = {
					 "productnum": $scope.$storage.options.cleaner.productnum,
					 "type": "cleaner",
					 "text": $scope.$storage.options.cleaner.text,
					 "unitprice": $scope.$storage.options.cleaner.unitprice,
					};
			};
			$scope.$storage.consolidatedProduct.line_item.accessory[$scope.$storage.options.cleaner.productnum].quantity = $scope.$storage.product.cleaner_qty;
		}
		
		// Groundset
		angular.forEach($scope.$storage.options.groundset, function(g,label){
			if(!$scope.$storage.consolidatedProduct.line_item.groundset[label]){
				$scope.$storage.consolidatedProduct.line_item.groundset[label] = {
					"productnum": label,
					"type": "groundset",
					"text": g.text,
					"unitprice": g.unitprice,
				};
			}
			$scope.$storage.consolidatedProduct.line_item.groundset[label].quantity = $scope.$storage.product.groundset_qty * g.quantity;
		});
		
		// Subtotal (without tax or shipping)
		$scope.$storage.consolidatedProduct.subtotal = 0;
		angular.forEach(angular.extend({},$scope.$storage.consolidatedProduct.line_item.groundset, $scope.$storage.consolidatedProduct.line_item.accessory), function(v,k){
			if(!v.quantity) v.quantity = 1;
			if(!v.unitprice) v.unitprice = 0;
			$scope.$storage.consolidatedProduct.subtotal += v.unitprice * v.quantity;
		});
		
		// Tax
		$scope.$storage.consolidatedProduct.tax = $scope.getTax();
		
		// Shipping
		if($scope.$storage.product.shipping) $scope.$storage.consolidatedProduct.shipping = $scope.$storage.product.shipping;
		else $scope.$storage.consolidatedProduct.shipping = 0;
		
		// Full total
		$scope.$storage.consolidatedProduct.total = $scope.$storage.consolidatedProduct.subtotal + $scope.$storage.consolidatedProduct.tax + $scope.$storage.consolidatedProduct.shipping;

	};
	
	$scope.getFerruleNum = function(wirenum, clampnum){
		if(wirenum && clampnum){
			if($scope.$storage.options.ferrule[$scope.$storage.options.clamp[clampnum].ferrule_type][wirenum].productnum){
				var ferrulenum = $scope.$storage.options.ferrule[$scope.$storage.options.clamp[clampnum].ferrule_type][wirenum].productnum;
				return ferrulenum;
			}
			
			return false;
		}
		
		return false;
	};
	
	$scope.getStrainReliefNum = function(clampnum){
		if($scope.$storage.options.clamp[clampnum].ferrule_type == 'Smooth'){
			return 1788;
		}
		else{
			return false;
		}
	};

	$scope.addProducttoConsolidation = function(line_item_cat, type, optionarr, num, qty){
		if(qty > 0){
			if(!$scope.$storage.consolidatedProduct.line_item[line_item_cat][num]){
				$scope.$storage.consolidatedProduct.line_item[line_item_cat][num] = {
					"productnum": num,
					"type": type,
					"quantity": qty
				};
				if($scope.$storage.options[optionarr][num]){
					$scope.$storage.consolidatedProduct.line_item[line_item_cat][num].unitprice = $scope.$storage.options[optionarr][num].price;
					$scope.$storage.consolidatedProduct.line_item[line_item_cat][num].text = $scope.$storage.options[optionarr][num].text;
				}
			}
			else{
				$scope.$storage.consolidatedProduct.line_item[line_item_cat][num].quantity += qty;
			}
		}
	};

	// Create email message body
	$scope.messageSubmit = function(messageName,messageEmail,messagePhone,messageComments){
		console.log("Message submitted.");
		var messageBody = "";
		var messageTo = "laura@laurahughes.com";
	
		if(messageName) messageBody += "Name: "+messageName+"\n\n";
		if(messageEmail) messageBody += "Email: "+messageEmail+"\n\n";
		if(messagePhone) messageBody += "Phone: "+messagePhone+"\n\n";
		if(messageComments) messageBody += "Comments: "+messageComments+"\n\n";
		messageBody += "Quote Total: "+$filter('currency')($scope.$storage.consolidatedProduct.total)+"\n\n";
		messageBody += "Quote Line Items: \n";

		angular.forEach($scope.$storage.consolidatedProduct.line_item.groundset, function(line_item){
			if(line_item){
				messageBody += "#"+line_item.productnum+" "+line_item.text+" x"+line_item.quantity+" @ "+$filter('currency')(line_item.unitprice)+" = "+$filter('currency')(line_item.quantity*line_item.unitprice)+"\n";
			}
		});
		
		messageBody += "Subtotal: "+$filter('currency')($scope.$storage.consolidatedProduct.subtotal)+"\n";
		if($scope.$storage.consolidatedProduct.tax) messageBody += "PA Tax: "+$filter('currency')($scope.$storage.consolidatedProduct.tax)+"\n";
		if($scope.$storage.consolidatedProduct.shipping) messageBody += "Shipping: "+$filter('currency')($scope.$storage.consolidatedProduct.shipping)+"\n";
		
		var postData = {
			"TO": messageTo,
			"NAME": messageName,
			"FROM": messageEmail, 
			"BODY": messageBody
		};

		 $http({
            url: "mail.php",
            method: "POST",
            data: postData,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        	})
        	.success(function(data, status, headers, config) {
        		console.log("Success!");
				console.log(data);
			  })
			  .error(function(data, status, headers, config) {
			  	console.log("Error!");
				console.log(data);
			  });
		};

	// Init
	$scope.init();

});
gbApp.directive('wirecolor', function() {
  return {
    template: '<div class="color_container">'+
    	'<div ng-repeat="color in $storage.options.wire_color">'+
				'<input type="radio" id="wire_color_{{ color }}" ng-model="$storage.product.wire_color" value="{{ color }}" ng-disabled="disableWireColor(\'{{ color }}\')" ng-change="consolidateProduct()" />'+
				'<label for="wire_color_{{ color }}" title="{{ color }}">'+
					'<div class="color_select bg_{{ color }}" ng-class="{ \'color_unselectable\' : disableWireColor(\'{{ color }}\'), \'border_darkblue\' : color == $storage.product.wire_color }">'+
						'<div ng-class="{ \'color_disabled\' : disableWireColor(\'{{ color }}\') }"></div>'+
					'</div>'+
				'</label>'+
			'</div>'+
		'</div>'
  };
});

// Jquery
$(function() {
	$( document ).tooltip();
});
