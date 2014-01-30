var idDelim = '_';
var intervalId;
var deployNetNameDefault, deployNetDescDefault, realServerNameDefault, cloneServerNameDefault, cloneServerDescDefault, newServerNameDefault, newServerDescDefault;
var startServerForms;
//var origValue = {};
var targetEditSpanName;
var serverFunctions;
var timedUpdate = null;
var serverTimeStamps = null;
var initialized = {};

$.assocArraySize = function(obj) {
    // http://stackoverflow.com/a/6700/11236
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function getServerId(elem) {
	return elem.id.split(idDelim)[1];	
}

function getIntRangeArr(stringRange) {
	return $.map(stringRange.split('-'), function(val) {
		return parseInt(val, 10);
	});	
}

function enableDkField(dropDownId, enabled) {
	var activeClass = 'dk_container';
	var dkField = $('#dk_container_' + dropDownId);
	
	if ($('#' + dropDownId)[0] && $('#' + dropDownId)[0].disabled) {
	   $('#' + dropDownId)[0].disabled = !enabled;
	}
	if (enabled) {
		dkField.addClass(activeClass);
	} else {
		dkField.removeClass(activeClass);
	}
}

function inProgress(jqObj, status, ignoreInputs) {
	jqObj.fadeTo('fast', (status)? .3 : 1);
	if (status) {
		jqObj.addClass('wait');
	} else {
		jqObj.removeClass('wait');
	};
	if (!ignoreInputs) {
		if (status) {
			jqObj.find(':input').attr('disabled', 'disabled');
		} else {
			jqObj.find(':input').removeAttr('disabled');
		}
		jqObj.find('div[id^="dk_container_"]').each(function() {
			enableDkField(this.id.replace("dk_container_", ""), !status);
		});
	}
}

function userMessage(jqElem, message) {
	// going to find a nice user messaging window interface.  For now, changing to just alert for consistency
	/*
	jqElem.hide();
	jqElem.html(message);
	jqElem.show('highlight', 'slow');
	*/
	alert(message);
}

function getRange(elem, type) {
	//var fieldId = (elem.id.indexOf(idDelim) == -1)? elem.id : elem.id.split(idDelim)[1];
	var field = null;
	if (elem.id.indexOf(idDelim) == -1) {
	    field = elem;
	} else {
	    var fieldIdParts = elem.id.split(idDelim);
	    //if (fieldIdParts.length > 2) {
	       fieldIdParts.shift();
	    //}
	    field = $("#" + fieldIdParts.join(idDelim))[0];
	}
	//var field = $("#" + fieldId)[0];
	return osValues[type].ranges[field.name];
}

function prepInputField(jqField, isConstrained, currValIsDefault, type) {
	//var jqField = $('#' + fieldId);
	var defaultVal = "";
	if (currValIsDefault) {
		defaultVal = jqField.val();
		jqField.focus(function() {
			if (jqField.val() === defaultVal) {
				jqField.val('');
			}
		});
	}
	jqField.blur(function() {
		if (currValIsDefault || isConstrained) {
			var currVal = jqField.val();
			if (currVal == '') {
				jqField.val((isConstrained)? getRange(jqField[0], type)[0] : defaultVal);
			} else if (isConstrained) {
				var currValNum = parseInt(currVal.replace(/\D/, '')) || 0;
				var range = getRange(jqField[0], type);
				jqField.val((currValNum < range[0] || currValNum > range[1])? range[0] : currValNum);
			}
		}
	});
}

/*
function prepAclRuleInputField(jqField, isConstrained, constraint) {
	defaultVal = jqField.val();
	jqField.focus(function() {
		if (jqField.val() === defaultVal) {
			jqField.val('');
		}
	});
	jqField.blur(function() {
		if (isConstrained) {
			constraint(jqField);
		}
	});
}
*/

function enableRealServerForm(enable, ignoreInputs) {
	if (enable) {
		inProgress($('#addRealServerFormRow'), false, ignoreInputs);
		$('#addRealServerButton').removeClass("disabled");
	} else {
		inProgress($('#addRealServerFormRow'), true, ignoreInputs);
		$('#addRealServerButton').addClass("disabled");
	}
}

function arrowClickServerLocalStorage(elem, chgAmount) {
	serverId = getServerId(elem);
	inputElem = $('#addLocalStorage_' + serverId);
	currNum = parseInt(inputElem.val().replace(/\D/g, ''));
	if (currNum + chgAmount < osValues.server.storage.min) {
		if (chgAmount > 0) {
			inputElem.val(osValues.server.storage.min + ' GB');
		} else {
			inputElem.val('0 GB');
		}
	} else if (currNum + chgAmount <= raValues.server.storage.max) {
		inputElem.val((currNum + chgAmount) + ' GB');
	} else {
		inputElem.val(raValues.server.storage.max + ' GB');
	}
	/*
	
	*/ 
}

function toggleForAddLocalStorage(elem) {
	var hideOthers = elem.value != "0 GB";
	inProgress($(elem).closest('form').find('div.groupEdit'), hideOthers, false);
	inProgress($(elem).closest('form').find('div.removeStorageEdit'), hideOthers, false);
}

function toggleForRemoveLocalStorage(elem) {
	var hideOthers = $(elem).attr('data-dk-dropdown-value') != "default";
	inProgress($(elem).closest('form').find('div.groupEdit'), hideOthers, false);
	inProgress($(elem).closest('form').find('div.addStorageEdit'), hideOthers, false);
}

function arrowClickChangeInputAmt(elem, chgAmount, range) {
    var fieldIdParts = elem.id.split(idDelim);
    //if (fieldIdParts.length > 2) {
        fieldIdParts.shift();
    //}
	var inputElem = $('#' + fieldIdParts.join(idDelim));
	var currNum = parseInt(inputElem.val().replace(/\D/, '')) || 0;
	var newVal = currNum + chgAmount;
	if (newVal < range[0]) {
		newVal = range[0];
	} else if (newVal > range[1]) {
		newVal = range[1];
	}
	inputElem.val(newVal);
}

function changeServerLocalStorage(elem) {
	serverId = getServerId(elem);
	inputElem = $('#addLocalStorage_' + serverId).get(0);
	newNum = parseInt(inputElem.value.replace(/\D/g, ''));
	var remainder = newNum % raValues.server.storage.increment;
	if (remainder != 0) { // round up values that do not fall on incremental lines
		newNum = newNum - remainder + raValues.server.storage.increment;
	}
	if (newNum <= raValues.server.storage.max) {
		inputElem.value = newNum + ' GB';
	} else {
		inputElem.value = raValues.server.storage.max + " GB";
	}
}

function toggleScsiPort(elem) {
	if (elem.className == 'localMemoryOn') {
		elem.className = 'localMemoryOff';
		elem.style.cursor = 'pointer';
	} else {
		elem.className = 'localMemoryOn';
	}	
}

function deselect() {  // Remove unintentional text selections due to arrow-clicking
	if (window.getSelection) {
		if (window.getSelection().empty) {  // Chrome
			window.getSelection().empty();
		} else if (window.getSelection().removeAllRanges) {  // Firefox
			window.getSelection().removeAllRanges();
		} else if (document.selection) {  // IE?
		  document.selection.empty();
		}
	}
}

function isEmpty(ob){
	for(var i in ob){
		return false;
	}
	return true;
}

function replaceContents(containerName, newEscapedContents) {
	$("#" + containerName).empty().html(unescape(newEscapedContents));
}

$('a.netInfo-static').click(function() {
	var targetEditSpan, targetTextSpan;
	var inputName;
	
	var ids = this.id.split(idDelim);
	
	targetEditSpanName = ids[0];
	targetTextSpanName= targetEditSpanName + "Text";
	inputName = (targetEditSpanName.toLowerCase().search("desc") == -1) ? "name" : "description";
	
	targetEditSpan = $("#" + targetEditSpanName);
	targetTextSpan = $("#" + targetTextSpanName);
	//origValue[targetEditSpanName] = targetEditSpan.html();
	targetEditSpan.data('origValue', targetEditSpan.html());
	//origValue[targetTextSpanName] = targetTextSpan.html();
	targetTextSpan.data('origValue', targetTextSpan.html());
	targetEditSpan.empty().html('<input type="text" name="' + inputName + '" value="' + targetEditSpan.data('origValue') + '" size="' + 
			targetEditSpan.data('origValue').length + '" id="' + inputName + 'Input" style="vertical-align: middle;" \><input type="hidden" ' +
			'name="netId" value="' + ids[1] + '">');
	targetTextSpan.empty().html('Hit Enter to submit or Esc to cancel.');
	
	$("#" + inputName + "Input").focus();
	$("#" + inputName + "Input").keyup(function(e) {
		if (e.which == 13) { // enter
			$("#netForm" + targetEditSpanName).submit();
		}
		if (e.which == 27) { // esc
			targetTextSpan.empty().html(targetTextSpan.data('origValue'));
			// Have to use setTimeout to asynchronously run a utility function to replace the contents of the targetEditSpan;
			// this is because otherwise we are deleting the input field that this keyup event function is running on, which
			// causes a jQuery error at runtime.
			setTimeout("replaceContents('" + targetEditSpanName + "', '" + escape(targetEditSpan.data('origValue')) + "')", 1);
		}
	});
	$("#" + inputName + "Input").blur(function() {
		targetTextSpan.empty().html(targetTextSpan.data('origValue'));
		// Have to use setTimeout to asynchronously run a utility function to replace the contents of the targetEditSpan;
		// this is because otherwise we are deleting the input field that this blur event function is running on, which
		// causes a jQuery error at runtime.
		setTimeout("replaceContents('" + targetEditSpanName + "', '" + escape(targetEditSpan.data('origValue')) + "')", 1);
	});
	
	
	$("#netForm" + inputName).validate({
		rules: {
			name: {
				required: true,
				maxlength: maxNetNameLength
			},
			description: {
				maxlength: maxNetDescLength
			}
		},
		messages: {
			name: {
				required: "Please provide a name for your network.",
				maxlength: "Please limit your network name to " + maxNetNameLength + " characters."
			},
			description: {
				maxlength: "Please limit your network description to " + maxNetDescLength + " characters."
			}
		},
		submitHandler: function(form) {
			var formData = $(form).serialize();
			$("#" + targetEditSpanName + "Text").empty().html(workingImg(23));
			$("#" + targetEditSpanName + " input")[0].disabled = true;
		    $.ajax({
				url: "modifyNetwork",
				type: "POST",
				data: formData,
				dataType: "json",
				success: function(data) {
					if (data.status.result == generalStatusSuccess) {
						if (targetEditSpanName.indexOf("Name") > -1) {
							$("#" + targetEditSpanName).empty().html(data.updated.name);
						} else if (targetEditSpanName.indexOf("Desc") > -1) {
							$("#" + targetEditSpanName).empty().html(data.updated.description);
						}
						$("#" + targetEditSpanName + "Text").empty().html(targetEditSpan.data('origValue'));
					} else {
						alert(data.message + "  [" + data.status.resultDetail + "]");
						$("#" + targetEditSpanName + " input").disabled = false;
						$("#" + targetEditSpanName + "Text").empty().html('Hit Enter to submit or Esc to cancel.');
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
				}
			});					
		}
	});
});

function origDelNetLinkVal(netId) {
	return '<a id="deleteNetwork_' + netId + '" class="largeNetworkIcon deleteNetwork"></a>';
}

function workingImg(size) {
	return '<img src="/images/working.gif" style="width: ' + size + 'px; height: ' + size + 'px; cursor: wait;" />';
}

function toggleServerManage(serverId, active) {
	var jqManage = $('#' + serverId + ' h5 a.trigger');
	if (active) {
		inProgress($('#' + serverId).find('div.editServerContainer'), false, true);
		jqManage.show();
	} else {
		if (jqManage.hasClass('open')) {
			jqManage.click();
		}
		jqManage.hide();
	}
}

function updateBasicServerInfo(serverUpdate) {
	var idTag = idDelim + serverUpdate.id;
	var currStatus = "";
	var newTimeStamp = null;
	if (serverUpdate.status != null) {
		newTimeStamp = (serverUpdate.status == null || serverUpdate.status.updateTime == null)? pageLoadTimeStamp : serverUpdate.status.updateTime;
		$('#updateTime' + idTag).val(newTimeStamp);			
		serverTimeStamps[serverUpdate.id] = newTimeStamp;
		currStatus += "..." + serverUpdate.status.action + ": ";
		if (serverUpdate.status.step != null) {
			currStatus += "step " + serverUpdate.status.step.number;
			if (serverUpdate.status.numberOfSteps != null) {
				currStatus += " of " + serverUpdate.status.numberOfSteps;
			}
			currStatus += " - " + serverUpdate.status.step.name;
			if (serverUpdate.status.step.percentComplete != null) {
				currStatus += " (" + serverUpdate.status.step.percentComplete + "% completed) ";
			}
			if (serverUpdate.status.failureReason != null) {
				currStatus += serverUpdate.status.failureReason + " - Please contact support to address this issue.";
			}
		}
	}
	$('#' + serverUpdate.id + ' div.serverProgress').text(currStatus).show();
	
	$('#serverStatus' + idTag).removeClass().addClass("server" 
			+ (serverUpdate.status == null? (serverUpdate.isStarted ? 'ON' : 'OFF') : 'WORKING')).attr("title", "Server is " 
			+ (serverUpdate.status == null? (serverUpdate.isStarted ? 'Running' : 'Stopped') : 'Processing Changes'));
	$('#serverNameDiv' + idTag + ' span.serverNameText').text(serverUpdate.name);
	$('#serverNameDiv' + idTag + ' div.serverDescription').text((serverUpdate.description == null)? '' : serverUpdate.description);
	$('#osCpu' + idTag + ' span.osText').text(serverUpdate.machineSpecification.operatingSystem.displayName);
	$('#osCpu' + idTag + ' span.cpuText').text(serverUpdate.machineSpecification.cpuCount);
	$('#memStore' + idTag + ' span.memoryText').text(serverUpdate.machineSpecification.memoryMb + "MB");
	$('#memStore' + idTag + ' span.storageText').text(serverUpdate.machineSpecification.osStorageGb + "GB - "
			+ serverUpdate.machineSpecification.additionalLocalStorageGb + "GB Local");
	$('#ips' + idTag + ' span.privIpText').text(serverUpdate.privateIpAddress);
	$('#ips' + idTag + ' span.pubIpText').text(serverUpdate.publicIpAddress == null ? 'Not Assigned' : serverUpdate.publicIpAddress);
}

function updateEditableServerInfo(serverFull) {
	var jqStorageEdit = null;
	var jqStorageSelect = null;
	var jqDkStorage = null;
	var jqDkOptions = null;
	
	var idTag = idDelim + serverFull.id;
	$('#serverName' + idTag).val(serverFull.name);
	$('#serverDescription' + idTag).val(serverFull.description);
	$('#cpus' + idTag).val(serverFull.machineSpecification.cpuCount);
	$('#dk_container_cpus' + idTag).find('li.dk_option_current').removeClass('dk_option_current').parent().find('a[data-dk-dropdown-value="'
			+ serverFull.machineSpecification.cpuCount + '"]').parent().addClass('dk_option_current');
	$('#dk_container_cpus' + idTag).find('span.dk_label').text(serverFull.machineSpecification.cpuCount);
	$('#memory' + idTag).val(serverFull.machineSpecification.memoryMb);
	$('#dk_container_memory' + idTag).find('li.dk_option_current').removeClass('dk_option_current').parent().find('a[data-dk-dropdown-value="'
			+ serverFull.machineSpecification.memoryMb + '"]').parent().addClass('dk_option_current');
	$('#dk_container_memory' + idTag).find('span.dk_label').text(serverFull.machineSpecification.memoryMb/1024 + " GB");
	$('#addLocalStorage' + idTag).val('0 GB');
	toggleForAddLocalStorage($('#addLocalStorage' + idTag).get(0));
	
	jqStorageSelect = $('#removeLocalStorage' + idTag);
	if (jqStorageSelect.length > 0) { // storage drop-down exists
		if (serverFull.additionalDisk == null || serverFull.additionalDisk.length == 0) { // but there are no longer any disks configured for this server
			/*alert("I would be removing the storage dropdown for '" + serverFull.name
					+ "' right now because " + (serverFull.additonalDisk == null ? "the additionalDisk property for that server is null" : ("the number of additional disks specified is " 
							+ serverFull.additionalDisk.length)) + ".");
			*/
			jqStorageSelect.parent().append($('<input type="text" class="form-text3 pseudo-dk-server storage-na" value="N/A" disabled="disabled" />'));
			jqStorageSelect.remove();
			$('#dk_container_removeLocalStorage' + idTag).remove();
			
		} else { // disks are configured for this server; delete and repopulate disks in both select and dropkick div
			/*alert("I would be repopulating the disks for both the select and dropkick divs for server '" + serverFull.name + "'.");*/
			
			jqStorageSelect.find('option[value!="default"]').remove();
			jqDkStorage = $('#dk_container_removeLocalStorage' + idTag);
			jqDkStorage.find('div ul li a[data-dk-dropdown-value!="default"]').parent().remove();
			jqDkOptions = jqDkStorage.find('ul.dk_options_inner');
			$.each(serverFull.additionalDisk, function (idx, disk) {
				jqStorageSelect.append($('<option value="' + disk.id + '">').text('(SCSI ID: ' + disk.scsiId + ') ' + disk.diskSizeGb + ' GB'));
				jqDkOptions.append($('<li>').append($('<a data-dk-dropdown-value="' + disk.id + '">').text('(SCSI ID: ' + disk.scsiId + ') ' + disk.diskSizeGb + ' GB')));
			});
			jqStorageSelect.val('default');
			jqDkOptions.find('li.dk_option_current').removeClass('dk_option_current').parent().find('a[data-dk-dropdown-value="default"]').parent().addClass('dk_option_current');
			jqDkStorage.find('span.dk_label').text("Remove none");
			jqDkStorage.find('a[data-dk-dropdown-value]').click(function() {
				toggleForRemoveLocalStorage(this);
			});
		}
	} else { // storage drop-down does not exist
		if (serverFull.additionalDisk != null && serverFull.additionalDisk.length > 0) { // But we have disks to display
			jqStorageEdit = $('#serverEditForm' + idTag).find('div.removeStorageEdit');
			jqStorageEdit.find('input.storage-na').remove();
			jqStorageEdit.append($('<select>').attr({
				id: 'removeLocalStorage' + idTag,
				name: 'removeLocalStorage',
				class: 'default removeLocalStorage',
				tabindex: '6'
			}).append($('<option value="default">').text('Remove none')));
			
			jqStorageSelect = jqStorageEdit.find('select');
			$.each(serverFull.additionalDisk, function (idx, disk) {
				jqStorageSelect.append($('<option value="' + disk.id + '">').text('(SCSI ID: ' + disk.scsiId + ') ' + disk.diskSizeGb + ' GB'));
			});
			jqStorageSelect.dropkick();
			jqStorageSelect.val('default');
			jqDkStorage = $('#dk_container_removeLocalStorage' + idTag);
			jqDkStorage.find('li.dk_option_current').removeClass('dk_option_current').parent().find('a[data-dk-dropdown-value="default"]').parent().addClass('dk_option_current');
			jqDkStorage.find('span.dk_label').text("Remove none");
		}
	}
	
	$('#vmVersionStatus' + idTag).text(serverFull.machineStatuses.vmwareToolsVersionStatus);
	$('#vmRunningStatus' + idTag).text(serverFull.machineStatuses.vmwareToolsRunningStatus);
	$('#vmApiVersion' + idTag).text(serverFull.machineStatuses.vmwareToolsApiVersion);
	if (serverFull.machineStatuses.vmwareToolsVersionStatus === osValues.server.vmware.tools.status.current) {
		$("#updateVmwareBtn" + idTag).hide();
	} else {
		$("#updateVmwareBtn" + idTag).show();
	}
	
	$('#alterPubIpLabel' + idTag).text((serverFull.publicIpAddress == null)? 'assign' : 'delete');
	$('#alterPubIpBtn' + idTag).attr({
		src: imgBaseUrl + '/' + ((serverFull.publicIpAddress == null)? 'assign' : 'delete') + 'PublicIP.png',
		alt: ((serverFull.publicIpAddress == null)? 'Assign' : 'Delete') + 'Public IP'
	});
}

//TODO: Include networks, too
function updateServers() {
	if (serverTimeStamps == null) {
		serverTimeStamps = {};
		$('input.updateTime').each(function() {
			serverTimeStamps[$(this).attr('name')] = $(this).val();
		});			
	}
	
	/*
	var msg = "";
	$.each(serverTimeStamps, function(key, val) {
		msg += key + ": " + val + "\n";
	});
	alert(msg);
	*/
	
	$.post('checkServerUpdates',
			serverTimeStamps, 
			function(data) {
				if (data.statusUpdateOnly != null) {
					$.each(data.statusUpdateOnly, function (index, serverUpdate) { // update basic server info for servers still in progress
						//alert ("About to do a basic update of server '" + serverUpdate.name + "'.");
						updateBasicServerInfo(serverUpdate);
					});
				}
				if (data.fullServers != null) {
					$.each(data.fullServers, function (index, serverFull) { // update full information or add new servers
						if ($('#' + serverFull.id).length > 0) { // this server exists in the display
							//alert ("About to do a full update of server '" + serverFull.name + "'.");
							updateBasicServerInfo(serverFull);
							updateEditableServerInfo(serverFull);
							
							if (serverFull.isStarted) { // set server buttons as appropriate
								$('a.serverButton[id$="' + idDelim + serverFull.id + '"]').not($('a.startButton')).not($('a.cloneButton')).not($('a.deleteButton')).removeClass('disabled').removeAttr('disabled');
								$('a.startButton[id$="' + idDelim + serverFull.id + '"]').addClass('disabled').attr('disabled', 'disabled');
							} else {
								$('a.serverButton[id$="' + idDelim + serverFull.id + '"]').not($('a.startButton')).not($('a.cloneButton')).not($('a.deleteButton')).addClass('disabled').attr('disabled', 'disabled');
								$('a.startButton[id$="' + idDelim + serverFull.id + '"]').removeClass('disabled').removeAttr('disabled');
							}
							
							serverTimeStamps[serverFull.id] = '';
							toggleServerManage(serverFull.id, true);
						} // if server does not exist, it will show up at next page refresh
					});
				}
				if (data.deleteIds != null) {
					var jqSrvCount = null;
					var currSrvCount = null;
					$.each(data.deleteIds, function (index, serverId) { // delete servers that no longer exist	
						jqSrvCount = $('#' + serverId).closest('li.netConfig').find('span.netSrvCount');
						currSrvCount = parseInt(jqSrvCount.text());
						jqSrvCount.text((currSrvCount > 0)? --currSrvCount : 0);					
						$('#' + serverId).remove();
					});
				}
			},
			'json');
	
	/*
	var msg = "Would be sending this query string for updates:\n";
	$.each(serverTimeStamps, function(key, val) {
		msg += key + ":\n     " + val + "\n";
	});
	alert(msg);
	*/
	
}


/********** CUSTOM FORM VALIDATION METHODS **********/
if (jQuery.validator) {
	jQuery.validator.addMethod("notEqual", function(value, element, param) {
		//alert('value = "' + value + '", param = "' + param + '".');
		return value !== param;
	});
	
	jQuery.validator.addMethod("pattern", function(value, element, param) {
	    return this.optional(element) || param.test(value);
	});
	
	jQuery.validator.addMethod("validProbeType", function(value, element, param) {
		var typeValid = false;
		$.each(osValues.probe.validTypes, function(index, val) {
			typeValid = value === val;
			if (typeValid) return false;
		});
		return typeValid;
	});
	
	jQuery.validator.addMethod("validRequestMethod", function(value, element, param) {
		var methodValid = false;
		$.each(osValues.probe.validMethods, function(index, val) {
			methodValid = value === val;
			if (methodValid) return false;
		});
		return methodValid;		
	});
	
	jQuery.validator.addMethod("validAction", function(value, element, param) {
		var response = false;
		$.each(osValues.acl.rule.action, function(index, val) {
			response = val === value;
			if (response) return false;
		});
		return response;		
	});
	
	jQuery.validator.addMethod("validProtocol", function(value, element, param) {
		var response = false;
		$.each(osValues.acl.rule.protocol, function(index, val) {
			response = val === value;
			if (response) return false;
		});
		return response;
	});
	
	jQuery.validator.addMethod("ipv4", function(value, element, param) {
	    return this.optional(element) || /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i.test(value);
	});
	
	jQuery.validator.addMethod("validPortRangeType", function(value, element, param) {
		var response = false;
		$.each(osValues.acl.rule.portRange.type, function(index, val) {
			response = val === value;
			if (response) return false;
		});
		return response;
	});
	
	jQuery.validator.addMethod("validAclRuleType", function(value, element, param) {
		var response = false;
		$.each(osValues.acl.rule.type, function(index, val) {
			response = val === value;
			if (response) return false;
		});
		return response;
	});
	
	jQuery.validator.addMethod("valid", function(value, element, validValues) {
		var response = false;
		$.each(validValues, function(index, val) {
			response = val === value;
			if (response) return false;
		});
		return response;
	});
	
	jQuery.validator.addMethod("functionTest", function(value, element, param) {
		return param[0];
	});
	
	jQuery.validator.addMethod("after", function(value, element, baseDateId) {
		var testDate = new Date(value);
		var baseDate = new Date($('#' + baseDateId).val());
		return testDate >= baseDate;
	});
	
	jQuery.validator.addMethod("maxDays", function(value, element, data) {
		var msOneDay = 1000*60*60*24;
		var startDate = new Date($('#' + data.startDateId).val());
		var endDate = new Date($('#' + data.endDateId).val());
		var numDays = endDate - startDate;
		var maxDays = ($('#' + data.reportTypeId).val() === 'auditlog')? osValues.report.auditlog.maxDays : osValues.report.maxDays;
		return (numDays >= 0) && ((numDays / msOneDay) <= maxDays);
	});
}	

/********** Page initializers **********/
function initClouds() {
	// Convert any option that was programmatically set with a class of "selected" to be "selected='selected'"
	$('option.selected').attr('selected', 'selected');
	
	// Convert any link that was programmatically set with a class of "disabled" to be "disabled='disabled'"
	$('a.disabled').attr('disabled', 'disabled');
	
	// Initialize all dropkick fields
	$('select.default').dropkick();
	
	// Initialize all accordion settings
	$("html").addClass("js");
	$.fn.accordion.defaults.container = false; 
	
	$("#tabs").accordion({
		el: ".h", 
		head: "h4, h5", 
		next: "div", 
		//initShow : "div.outer:eq(2)"
	});
	
	$("html").removeClass("js");			
	
	
	// Tabs
	$('#tabs').tabs();
	
	// Superbox
	$.superbox();	
	
	// Hide all servers' "manage" links if they have operations in progress
	$('li.srvConfig').find('div.inTransition').each(function() {
		toggleServerManage($(this).closest('li').attr('id'), false);
	});
	
	// place up-down arrows
	$('div.upDownSelectorContainer').each(function() {
		var inputBox = $(this).siblings('input[name="addLocalStorage"]');
		$(this).css("left", inputBox.width()
				+ parseInt(inputBox.css("padding-left").replace(/\D/g, '')) 
				+ parseInt(inputBox.css("padding-left").replace(/\D/g, '')));
	});
	
	// prepare delete Network button
	$('a.deleteNetwork').click(function() {
		var netId = this.id.split(idDelim)[1];
		
		if (confirm('Are you sure that you want to delete this network?')) {
			//origValue['#delNetLink_' + netId] = $('#delNetLink_' + netId).html();
			//$('#delNetLink_' + netId).html(workingImg(37));
			//this.disabled = true;
			$(this).removeClass('deleteNetwork').addClass('working');
			$('a.largeNetworkIcon').attr('disabled', 'disabled');
			//$(this).html(workingImg(37));
			$.post("deleteNetwork", { netId: netId },
				function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
						//$('#delNetLink_' + data.netId).html(origDelNetLinkVal(origValue['#delNetLink_' + data.netId]));
						//$('#deleteNetwork_' + data.netId).html('')[0].disabled = false;
						$('#deleteNetwork_' + data.netId).removeClass('working').addClass('deleteNetwork');
						$('a.largeNetworkIcon').removeAttr('disabled');
					} else {
						$('li#' + data.netId).remove();
						alert("Your network has been successfully removed.");
					};					
				}, 
				"json"
			);
		}
	});
	
	// prepare local storage up/down buttons
	$('div.upSelector').mousedown(function() {
		elem = this;
		deselect();
		arrowClickServerLocalStorage(elem, 10);
		intervalId = setInterval(function() { arrowClickServerLocalStorage(elem, 10); }, 125);
	}).bind('mouseup mouseleave', function() {
		clearInterval(intervalId);
		toggleForAddLocalStorage($(this).closest('div.addStorageEdit').find('input.addLocalStorage').get(0));
	});
	$('div.downSelector').mousedown(function() {
		elem = this;
		deselect();
		arrowClickServerLocalStorage(elem, -10);
		intervalId = setInterval(function() { arrowClickServerLocalStorage(elem, -10); }, 125);
	}).bind('mouseup mouseleave', function() {
		clearInterval(intervalId);
		toggleForAddLocalStorage($(this).closest('div.addStorageEdit').find('input.addLocalStorage').get(0));
	});
	
	// prepare local storage input fields
	$('input.addLocalStorage').change(function() {
		changeServerLocalStorage(this);
		toggleForAddLocalStorage(this);
	});
	
	// prepare local storage removal field
	$('div[id^="dk_container_removeLocalStorage"] a[data-dk-dropdown-value]').click(function(){
		toggleForRemoveLocalStorage(this);
	});
	
	$('.form-text3').click(function() {
		this.select();
	});
	
	
	// serialize and store all embedded server forms as hashes so we can submit only changes...
	function convertSerializedArrayToHash(arr) {
		var hash = {};
		for (var i = 0; i<arr.length; i++) {
			hash[arr[i].name] = arr[i].value;
		}
		return hash;
	}	
	function hashDiff(h1, h2) {
		var diff = {};
		for (key in h2) {
			if (h1[key] !== h2[key]) diff[key] = h2[key];
		}
		return diff;
	}
	
	// ...and set up server form validation and submission
	startServerForms = {};
	$("form.serverEditForm").each(function(i) {
		startServerForms[this.id] = convertSerializedArrayToHash($(this).serializeArray());
		$(this).validate({
			rules: {
				name: {
					required: true,
					maxlength: maxSrvNameLength
				},
				description: {
					maxlength: maxSrvDescLength
				}
			},
			messages: {
				name: {
					required: "Please provide a name for your server.",
					maxlength: jQuery.format("Please limit your server name to {0} characters.")
				},
				description: {
					maxlength: jQuery.format("Please limit your server description to {0} characters.")
				}
			},
			submitHandler: function(form) {
			    var currentItems = convertSerializedArrayToHash($(form).serializeArray());
			    var itemsToSubmit = hashDiff(startServerForms[form.id], currentItems); // cull out and submit only changed items
			    
			    if (!isEmpty(itemsToSubmit)) {
			    	itemsToSubmit['serverId'] = form.id.split(idDelim)[1];
			    	if (itemsToSubmit['addLocalStorage'] != null) {
			    		itemsToSubmit['addLocalStorage'] = itemsToSubmit['addLocalStorage'].replace(/\D/g, '');
			    	}
			    	
			    	if (itemsToSubmit['removeLocalStorage'] != null) {
			    		if (itemsToSubmit['removeLocalStorage'] === 'default') {
			    			delete itemsToSubmit.removeLocalStorage;
			    		}
			    	}
			    	
			    	if (!isEmpty(itemsToSubmit)) {
			    		if (serverTimeStamps) {
		    				serverTimeStamps[itemsToSubmit['serverId']] = pageLoadTimeStamp;
		    			}
		    			$('#updateTime_' + itemsToSubmit['serverId']).val(pageLoadTimeStamp);
				    	var jqEditServerContainer = $('#' + itemsToSubmit['serverId']).find('div.editServerContainer');
				    	var jqApplyChangesBtn = $('#applyServerChanges' + idDelim + itemsToSubmit['serverId']);
				    	inProgress(jqEditServerContainer, true, true);
				    	jqApplyChangesBtn.attr("disabled", "disabled");
				    	
				    	$.ajax({
							url: "modifyServer",
							type: "POST",
							data: itemsToSubmit,
							dataType: "json",
							success: function(data) { // TODO: better handling of success and error states							
								if (data.message != null && data.message != "") {
									alert(data.message);
									inProgress($('#' + itemsToSubmit['serverId']).find('div.editServerContainer'), true, true);
								} else {
									$('#' + itemsToSubmit['serverId'] + ' div.serverProgress').text("[Executing " + data.status.operation + "]").show();
									inProgress($('#' + itemsToSubmit['serverId']).find('div.editServerContainer'), true, true);
									toggleServerManage(itemsToSubmit['serverId'], false);
									updateServers();
								}
								
								$('#applyServerChanges' + idDelim + itemsToSubmit['serverId']).removeAttr("disabled");
								
								//$("form.serverEditForm").each(function(i) {
								//	startServerForms[this.id] = convertSerializedArrayToHash($(this).serializeArray());
								//});
								startServerForms[form.id] = convertSerializedArrayToHash($(form).serializeArray());
							},
							error: function(jqXHR, textStatus, errorThrown) {
								alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
							}
						});
						
				    	/*
				    	var serializedItems = "";
				    	$.each(itemsToSubmit, function(key, value) {
				    		serializedItems += "\t" + key + " --> " + value + "\n"; 
				    	});
				    	alert("Would be submitting:\n" + serializedItems);
				    	*/
			    	}
			    }
			}
		});
	});
	
	$('img.applyServerChangesBtn').click(function() {
		if (!($(this).hasClass("disabled"))) {
			$(this).closest('form').submit();
		}
	});
	
	$('img.pubIpButton').click(function() {
		if (!$(this).hasClass('disabled')) {
			$(this).addClass('disabled');
			if ($(this).hasClass('assignPubIpBtn')) {
				serverFunctions.click.addPublicIpButtonClick(this);
			} else {
				if (confirm("Are you sure that you want to delete this server's public IP address?")) {
					serverFunctions.click.delPublicIpButtonClick(this);
				}
			}
		}
	});
		
		
	// set up all server functions
	serverFunctions = {
		//"response" : {},
		"click" : {
			"serverManipulationButtonClick" : function(elem) {				
				var operationAndId = elem.id.split(idDelim);
				serverId = operationAndId[1];
				operation = operationAndId[0];

				if (operation === serverOpDelete) {
					if (!confirm('Are you sure that you want to delete this server?')) {
						return;
					}
				}
				
				inProgress($('#' + serverId).find('div.editServerContainer'), true, true);
				
				if (serverTimeStamps) {
    				serverTimeStamps[serverId] = pageLoadTimeStamp;
    			}
    			$('#updateTime_' + serverId).val(pageLoadTimeStamp);
				
				$.post("server", { 
						serverId: serverId,
						operation: operation
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							inProgress($('#' + data.id).find('div.editServerContainer'), false, true);
						} else {
							$('#' + data.id + ' div.serverProgress').text("[Executing " + data.status.operation + "]").show();
							inProgress($('#' + data.id).find('div.editServerContainer'), false, true);
							toggleServerManage(data.id, false);
							updateServers();
						}
					}, 
					"json"
				);				
			},
			"addPublicIpButtonClick" : function(elem) {
				var serverId = elem.id.split(idDelim)[1];
				
				$('#alterPubIpBtn' + idDelim + serverId).attr('src', imgBaseUrl + '/working.gif').addClass('workingPubIp');
				
				var sourceIp = $('#ips' + idDelim + serverId + ' span.privIpText').text();
				var netId = $(elem).closest('li.netConfig').attr('id');
				
			    $.ajax({
					url: "addNatRule",
					type: "POST",
					data: {
						sourceIp: sourceIp,
						netId: netId
					},
					dataType: "json",
					success: function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
						} else {
							$('#ips' + idDelim + serverId + ' span.pubIpText').text(data.rule.natIp);
							$('#alterPubIpLabel' + idDelim + serverId).text('delete');
							$('#alterPubIpBtn' + idDelim + serverId).attr({
								src: imgBaseUrl + '/deletePublicIP.png',
								alt: 'Delete Public IP'
							}).removeClass('assignPubIpBtn disabled workingPubIp').addClass('deletePubIpBtn');
							
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
						alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					}
				});
			},
			"delPublicIpButtonClick" : function(elem) {
				var serverId = elem.id.split(idDelim)[1];
				
				$('#alterPubIpBtn' + idDelim + serverId).attr('src', imgBaseUrl + '/working.gif').addClass('workingPubIp');
				
				var sourceIp = $('#ips' + idDelim + serverId + ' span.privIpText').text();
				var netId = $(elem).closest('li.netConfig').attr('id');
				
			    $.ajax({
					url: "natrule/deletebyserverip",
					type: "POST",
					data: {
						sourceIp: sourceIp,
						netId: netId
					},
					dataType: "json",
					success: function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
						} else {
							$('#ips' + idDelim + serverId + ' span.pubIpText').text("Not Assigned");
							$('#alterPubIpLabel' + idDelim + serverId).text('assign');
							$('#alterPubIpBtn' + idDelim + serverId).attr({
								src: imgBaseUrl + '/assignPublicIP.png',
								alt: 'Assign Public IP'
							}).removeClass('deletePubIpBtn disabled workingPubIp').addClass('assignPubIpBtn');
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
						alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					}
				});
			}
		} /*,
		"powerOn" : function(serverId) {
			$('a.serverButton[id$="_' + serverId + '"]').not($('a.startButton')).not($('a.cloneButton')).not($('a.deleteButton')).removeClass('disabled').removeAttr('disabled');
			$('a.startButton[id$="_' + serverId + '"]').addClass('disabled').attr('disabled', 'disabled');
			//$('#serverStatus' + idDelim + serverId).removeClass("serverOFF").addClass("serverON").attr("title", "Server is Running");
		},
		"powerOff" : function(serverId) {
			$('a.serverButton[id$="_' + serverId + '"]').not($('a.startButton')).not($('a.cloneButton')).not($('a.deleteButton')).addClass('disabled').attr('disabled', 'disabled');
			$('a.startButton[id$="_' + serverId + '"]').removeClass('disabled').removeAttr('disabled');
			//$('#serverStatus' + idDelim + serverId).removeClass("serverON").addClass("serverOFF").attr("title", "Server is Stopped");
		}*/
	};
	/*
	serverFunctions.response[serverResponseOpUpgVmTools] = function(data) {
		if (data.status.result === generalStatusSuccess) {
			$("#updateVmwareBtn_" + data["serverId"]).hide();
		}
	};
	serverFunctions.response[serverResponseOpStart] = function(data) {
		if (data.status.result === generalStatusSuccess) {
			serverFunctions.powerOn(data.serverId);
		}
	};
	serverFunctions.response[serverResponseOpShutdown] = function(data) {
    	if (data.status.result === generalStatusSuccess) {
			serverFunctions.powerOff(data.serverId);
		}
	};
	serverFunctions.response[serverResponseOpReboot] = function(data) {
		if (data.status.result === generalStatusSuccess) {
			serverFunctions.powerOff(data.serverId);
		}			
	};
	serverFunctions.response[serverResponseOpReset] = function(data) {
		if (data.status.result === generalStatusSuccess) {
			serverFunctions.powerOff(data.serverId);
		}			
	};
	serverFunctions.response[serverResponseOpPoweroff] = function(data) {
		if (data.status.result === generalStatusSuccess) {
			serverFunctions.powerOff(data.serverId);
		}			
	};
	/*
	serverFunctions.response[serverResponseOpDelete] = function(data) {
		if (data.status.result === generalStatusSuccess) {
			$('li#' + data.serverId).remove();
		}			
	};
	*/

	// set up server manipulation buttons
	$('a.serverButton').not($('a.cloneButton')).click(function() {
		if (!$(this).hasClass('disabled')) {
			serverFunctions.click.serverManipulationButtonClick(this);
		}
	});
	
	// set up timed task to refresh servers in browser to reflect latest status and information
	function startTimedUpdates() {
		return window.setInterval(updateServers, 60000); // run every minute
	}
	
	// initiate status updates, keeping track with timedUpdate so that it can be stopped and restarted as necessary
	// using clearInterval(timedUpdate)
	timedUpdate = startTimedUpdates();
	/*
	$('#upNow').click(function() {
		updateServers();
	});
	*/
}

function initDeployNetwork() {
	deployNetworkNameDefault = $('#newNetworkName').val();
	deployNetworkDescriptionDefault = $('#newNetworkDescription').val();
	$('#newNetworkName').focus(function() {
		if ($('#newNetworkName').val() == deployNetworkNameDefault) {
			$('#newNetworkName').val('');
		}
	});
	$('#newNetworkName').focus();
	$('#newNetworkName').blur(function() {
		if ($('#newNetworkName').val() == '') {
			$('#newNetworkName').val(deployNetworkNameDefault);
		}
	});
	$('#newNetworkDescription').focus(function() {
		if ($('#newNetworkDescription').val() == deployNetworkDescriptionDefault) {
			$('#newNetworkDescription').val('');
		}
	});
	$('#newNetworkDescription').blur(function() {
		if ($('#newNetworkDescription').val() == '') {
			$('#newNetworkDescription').val(deployNetworkDescriptionDefault);
		}
	});
	
	
	
	
	// set up form validation and submission
	$("#deployNetworkForm").validate({
		rules: {
			name: {
				required: true,
				notEqual: deployNetworkNameDefault,
				maxlength: maxNetNameLength
			},
			description: {
				maxlength: maxNetDescLength
			}
		},
		messages: {
			name: {
				required: "Please provide a name for your new network.",
				notEqual: "Please provide a name for your new network.",
				maxlength: jQuery.format("Please limit your network name to {0} characters.")
			},
			description: {
				maxlength: jQuery.format("Please limit your network description to {0} characters.")
			}
		},
		invalidHandler: function(form, validator) {
			var errors = validator.numberOfInvalids();
			if (errors) {
				var message =
					((errors == 1)
						? 'There is an error in 1 field'
						: 'There are errors in ' + errors + ' fields') +
					' below. Please correct and re-submit.';
		        $("div.error span").empty().html(message);
		        $("div.error").show();
		    } else {
		        $("div.error").hide();
		    }
		},
		submitHandler: function(form) {
			if ($('#newNetworkDescription').val() == deployNetworkDescriptionDefault) {
				$('#newNetworkDescription').val('');
			}
			
			inProgress($('#deployNetworkForm'), true, true);
			$('input[type="image"]').attr("disabled", "disabled");
			
			$(form).ajaxSubmit({
				type: "POST",
				dataType: "json",
				success: function(data) { // TODO: better handling of success and error states
					if (data.message != null && data.message != "") {
						alert(data.message);
						inProgress($('#deployNetworkForm'), false, true);
						$('input[type="image"]').removeAttr("disabled");
					} else {
						alert("The creation of your new network has been successfully initiated.");
						window.top.location.reload();
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
				}				
			});
			if ($('#newNetworkDescription').length != 0 && $('#newNetworkDescription').val() == '') {
				$('#newNetworkDescription').val(deployNetworkDescriptionDefault);
			}
		}
	});
	
	$('#cancelBtn').click(function() {
		top.$('#superbox .close a').click();
	});
}

function initCloneServer() {
	var imageNameValid = false;
	//var imageNameValidator = null;
	var imageNameExistsError = "This image name already exists in the data center. Please specify a different one.";
	function validateImageName(imageName, dataCenter, sync, validator) {
		$.ajax({
			type: "POST",
			url: "validateImageName",
			async: !sync, // so default (if sync not provided) is asynchronous, as appropriate
			data: {
				imageName: imageName,
				location: dataCenter
			},
			success: function(data) {
				if (data.message != null && data.message != "") {
					if (validator) {
						validator.showErrors({"name": "Unable to determine if image name is available.  Error message: " + data.message});
					}
				} else {
					if (sync) {
						imageNameValid = data.isValid;
					} else {
						if (validator) {
							validator.showErrors({"name": ((data.isValid)? "This name is available." : imageNameExistsError)});
						} else {
							if (!data.isValid) alert(imageNameExistsError);
						}
						
					}
				}
			},
			dataType: "json"
		});
		
		if (sync) {
			var retVal = imageNameValid;
			imageNameValid = false;
			return retVal;
		}
	}
	
	var jqImageName = $('#imageName');
	var jqImageDesc = $('#imageDesc');
	
	cloneServerNameDefault = jqImageName.val();
	cloneServerDescriptionDefault = jqImageDesc.val();
	jqImageName.focus(function() {
		if (jqImageName.val() == cloneServerNameDefault) {
			jqImageName.val('');
		}
	});
	jqImageName.focus();
	jqImageName.blur(function() {
		var currImgNameVal = jqImageName.val();
		if (currImgNameVal == '') {
			jqImageName.val(cloneServerNameDefault);
		} else {

		}
	});
	jqImageDesc.focus(function() {
		if (jqImageDesc.val() == cloneServerDescriptionDefault) {
			jqImageDesc.val('');
		}
	});
	jqImageDesc.blur(function() {
		if (jqImageDesc.val() == '') {
			jqImageDesc.val(cloneServerDescriptionDefault);
		}
	});
	
	
	// set up form validation and submission
	//imageNameValidator = 
	$("#cloneServerForm").validate({
		rules: {
			clone: {
				required: true,
				notEqual: cloneServerNameDefault,
				maxlength: osValues.image.name.maxLength//,
				//functionTest: function(elem) {
					// uncomment this after July 24th
				//	return true; // validateImageName($(elem).val(), $('#dataCenter').val(), true, this);
				//}
			},
			desc: {
				maxlength: osValues.image.description.maxLength
			}
		},
		messages: {
			clone: {
				required: "Please provide a name for your new server image.",
				notEqual: "Please provide a name for your new server image.",
				maxlength: jQuery.format("Please limit your server image name to {0} characters.")//,
				//functionTest: imageNameExistsError
			},
			desc: {
				maxlength: jQuery.format("Please limit your server image description to {0} characters.")
			}
		},
		invalidHandler: function(form, validator) {
			var errors = validator.numberOfInvalids();
			if (errors) {
				var message =
					((errors == 1)
						? 'There is an error in 1 field'
						: 'There are errors in ' + errors + ' fields') +
					' below. Please correct and re-submit.';
		        $("div.error span").empty().html(message);
		        $("div.error").show();
		    } else {
		        $("div.error").hide();
		    }
		},
		submitHandler: function(form) {
			if ($('#imageDesc').val() == cloneServerDescriptionDefault) {
				$('#imageDesc').val('');
			}
			
			inProgress($('#overlayContainer'), true, true);
			//$('#cloneServerForm').attr("disabled", "disabled");
			$('#startBtn').attr("disabled", "disabled");
			
			$(form).ajaxSubmit({
				type: "POST",
				dataType: "json",
				url: "cloneServer",
				success: function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
						inProgress($('#overlayContainer'), false, true);
						//$("#cloneServerForm").removeAttr("disabled");
						$('#startBtn').removeAttr("disabled");
						if ($('#imageDesc').length != 0 && $('#imageDesc').val() == '') {
							$('#imageDesc').val(cloneServerDescriptionDefault);
						}
					} else {
						alert("The cloning process has been successfully initiated.");
						parent.updateServers();
						$('#cancelBtn').click();
					}
					
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
				}
			});

		}
	});
	
	$('#cancelBtn').click(function() {
		top.$('#superbox .close a').click();
	});
}

function initAddServers() {
	//var OS_IMG = "1";
	//var CUST_IMG = "2";
	var SOFT_IMG = "3";
	
	$('#tabs').tabs();
	$('#scrollbarAdd1').tinyscrollbar();
	$('select.default').dropkick();
	
	var firstTab2 = true;
	$('#tabs a[href="#tabs-2"]').click(function() {
		if (firstTab2) {
			$('#scrollbarAdd2').tinyscrollbar();
		}
		firstTab2 = false;
	});
	
	var firstTab3 = true;
	$('#tabs a[href="#tabs-3"]').click(function() {
		if (firstTab3) {
			$('#scrollbarAdd3').tinyscrollbar();
		}
		firstTab3 = false;
	});
	
	function toggleServerFields(anchor, os) {
		var jqAnchor = $(anchor);
		var jqTab = jqAnchor.closest('div[id^="tabs-"]');
		jqTab.find('div.addServerList').find('a').hide();
		jqTab.find('a.' + os).show();
		jqTab.find('div[id^="scrollbarAdd"]').tinyscrollbar_update();
		jqAnchor.addClass('showing').siblings().removeClass('showing');
	}
	
	$('a.osPick_CEN').click(function() {
		toggleServerFields(this, "CEN");
	});
	$('a.osPick_RED').click(function() {
		toggleServerFields(this, "RED");
	});
	$('a.osPick_UBU').click(function() {
		toggleServerFields(this, "UBU");
	});
	$('a.osPick_WIN').click(function() {
		toggleServerFields(this, "WIN");
	});
	$('a.osPick_ALL').click(function() {
		toggleServerFields(this, "ALL");
	});
	
	$('a.ALL').click(function() {
		var imgId = this.id.split(idDelim)[1];
		var scrollId = $(this).closest('div[id^="scrollbarAdd"]').attr("id");
		var imgClass = scrollId.substring(scrollId.length-1);
		$('#startServer').val(imgClass == SOFT_IMG);
		$('#overlayHeaderAddServer').find('div.subHeadContent').hide();
		$('#overlayContainer').hide();
		
		var link = $(this);
		$('#deploySrvImgName').html(link.find('span.serverName').html());
		$('#deploySrvSpecs').html(link.find('span.serverDetails').html());
		$('#deploySrvImgDesc').html(link.find('span.serverDesc').html());
		
		$('#deployImgId').val(imgId);
		
		var imgType;
		if (link.hasClass("CEN")) {
			imgType = "CEN";
		} else if (link.hasClass("RED")) {
			imgType = "RED";
		} else if (link.hasClass("UBU")) {
			imgType = "UBU";
		} else {
			imgType = "WIN";
		}
		//$('#osLogo').css({'background-image': 'url(' + imgBaseUrl + '/' + imgType + '.gif)'});
		$('#osLogo').attr('src', imgBaseUrl + '/' + imgType + '.gif');
		
		var jqNewServerName = $('#newServerName');
		var jqNewServerDesc = $('#newServerDesc');		
		newServerNameDefault = jqNewServerName.val();
		newServerDescriptionDefault = jqNewServerDesc.val();
		jqNewServerName.focus(function() {
			if (jqNewServerName.val() == newServerNameDefault) {
				jqNewServerName.val('');
			}
		});
		jqNewServerName.blur(function() {
			if (jqNewServerName.val() == '') {
				jqNewServerName.val(newServerNameDefault);
			} else {

			}
		});
		jqNewServerDesc.focus(function() {
			if (jqNewServerDesc.val() == newServerDescriptionDefault) {
				jqNewServerDesc.val('');
			}
		});
		jqNewServerDesc.blur(function() {
			if (jqNewServerDesc.val() == '') {
				jqNewServerDesc.val(newServerDescriptionDefault);
			}
		});
		
		/*
		if (imgClass === SOFT_IMG) {
			$('#softwareBlock').show();
			$('#loginBlock').show();
			$('#deployBtn').hide();
		} else if (imgType === OS_IMG) {
			$('#softwareBlock').hide();
			$('#loginBlock').show();
			$('#deployBtn').show();
		} else if (imgType === CUST_IMG) {
			$('#softwareBlock').hide();
			$('#loginBlock').hide();
			$('#deployBtn').show();
		}
		*/
		
		$("#deployProdSrvForm").validate({
	    	onkeyup: false,
	    	errorLabelContainer: '#deployServerErrMsg',
	    	wrapper: "li",
			rules: {
				name: {
					required: true,
					notEqual: newServerNameDefault
				},
				netId: {
					required: true
				},
				password: {
					required: true
				},
				passConfirm: {
					equalTo: "#pass"
				}
			},
			messages: {
				name: {
					required: "Please provide a name for your new Server",
					notEqual: "Please provide a name for your new Server"
				},
				netId: {
					required: "You must choose an available Network for this new Server."
				},
				password: {
					required: "You must specify a Primary Login password."
				},
				passConfirm: {
					equalTo: "The password and password confirmation fields do not match."
				}
				
			},
			submitHandler: function(form) {
				if (jqNewServerDesc.val() == newServerDescriptionDefault) {
					jqNewServerDesc.val('');
				}
				
				inProgress($('#overlayContainer2'), true, true);
				//$('#deployProdSrvForm').attr("disabled", "disabled");
				$('#startBtn').attr("disabled", "disabled");
				
				$(form).ajaxSubmit({
					type: "POST",
					dataType: "json",
					success: function(data) { // TODO: better handling of success and error states						
						if (data.message != null && data.message != "") {
							alert(data.message);
							inProgress($('#overlayContainer2'), false, true);
							//$('#deployProdSrvForm').removeAttr("disabled");
							$('#startBtn').removeAttr("disabled");
						} else {
							alert("The creation of your new server has been successfully initiated.  Check the status of its deployment in the manager of the network you specified.");
							inProgress($('#overlayContainer2'), false, true);
							$('#overlayContainer2').hide();
							$('#overlayContainer').show();
							$('#overlayHeaderAddServer').find('div.subHeadContent').show();
							$('#tabs ul li a[href="#tabs-1"]').click();
							$('#startBtn').removeAttr("disabled");
							$("#deployProdSrvForm").get(0).reset();
							
							top.$('#superbox-overlay').unbind('click').click(function() {
								top.$('#superbox').hide();
								top.$('#superbox-container p.loading').show();
								top.location.reload();
							});
							
							top.$('#superbox .close a').unbind('click').click(function() {
								top.$('#superbox-overlay').unbind('click');
								top.$('#superbox').hide();
								top.$('#superbox-container p.loading').show();
								top.location.reload();
							});
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
						alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					}
				});			
			}
		});
		
		$('#addServerBtn').click(function() {
			$("#deployProdSrvForm").submit();
		});
		
		$('#cancelBtn').click(function() {
			top.$('#superbox .close a').click();
		});
		
		$('#overlayContainer2').show();
		
	});
}

function initManageIPs() {
	$('#scrollbarPublicIp').tinyscrollbar();
	
	// Convert any option that was programmatically set with a class of "checked" to be "checked='checked'".
	// Also, disable checked radios to prevent clicking them from kicking off ajax requests.
	$('input[type="radio"].checked').attr('checked', 'checked').attr('disabled', 'disabled');
	
	$('input[type="radio"].serverToVipRadio').click(function() {
		var ids = this.id.split(idDelim);
		//var type = ids[0];
		var blockId = ids[1];
		var netId = ids[2];
		
		inProgress($('div#listedIPContainer_' + blockId), true);
		
		$.post("setPubBlockServerToVipConnectivity", {
			blockId: blockId,
			netId: netId,
			enabled: this.value
		},
		function(data) {
			if (data.message != null && data.message != "") {
				alert(data.message);
			} else {
				$('input[type="radio"]#' + ((data.enabled)? "enabled" : "disabled") + idDelim + blockId + idDelim + netId).attr("disabled", "disabled");
				if (data.enabled) {
					$('input[type="radio"]#disabled' + idDelim + blockId + idDelim + netId).removeAttr('disabled');
				} else {
					$('input[type="radio"]#enabled' + idDelim + blockId + idDelim + netId).removeAttr('disabled');
				}
			}
			inProgress($('div#listedIPContainer_' + data.blockId), false);
		},
		"json"
	);		
		
	});
	
	$('a.deleteIPButton').click(function() {
		if (confirm("Are you sure that you want to release this public IP block?")) {
			var ids = this.id.split(idDelim);
			var blockId = ids[1];
			var netId = ids[2];
			
			inProgress($('div#listedIPContainer_' + blockId), true);
			
			$.post("deletePubBlock", {
					blockId: blockId,
					netId: netId
				},
				function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
						inProgress($('div#listedIPContainer_' + data.blockId), false);
					} else {
						$('div#listedIPContainer_' + data.blockId).remove();
						alert("Your public IP block reservation has been successfully removed.");
					}
				},
				"json"
			);
		}
	});
	
	$('a.requestPubIpBlockLink').click(function() {
		if (!this.disabled) {
			var netId = this.id.split(idDelim)[1];
			
			this.disabled = true;
			inProgress($(this), true);
			
			$.post("reservePubBlock", {netId: netId},
				function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
					} else {
						var newBlockDiv = $('div.publicBlock_Template').clone(true);
						newBlockDiv.find('span.firstIp_template').text(data.firstIp).removeClass('firstIp_template');
						newBlockDiv.find('span.lastIp_template').text(data.lastIp).removeClass('lastIp_template');
						var firstRadio = newBlockDiv.find('input[type="radio"].serverToVipEnabledTrue_blockId').attr('name', 'serverToVipEnabled' + idDelim + data.blockId).attr('id', 
								'enabled' + idDelim + data.blockId + idDelim + data.netId).removeClass('serverToVipEnabledTrue_blockId')[0];
						firstRadio.checked = data.serverToVipConnectivity;
						if (firstRadio.checked) {
							firstRadio.disabled = true;
						}
						var lastRadio = newBlockDiv.find('input[type="radio"].serverToVipEnabledFalse_blockId').attr('name', 'serverToVipEnabled' + idDelim + data.blockId).attr('id', 
								'disabled' + idDelim + data.blockId + idDelim + data.netId).removeClass('serverToVipEnabledFalse_blockId')[0];
						lastRadio.checked = !data.serverToVipConnectivity;
						if (lastRadio.checked) {
							lastRadio.disabled = true;
						}
						newBlockDiv.find('a.deleteIPButton_blockId').attr('id', 'deleteButton' + idDelim + data.blockId + idDelim + data.netId).removeClass('deleteIPButton_blockId');
						newBlockDiv.appendTo($('div.overview')).attr('id', 'listedIPContainer_' + data.blockId).removeClass('publicBlock_Template').removeClass('template');
						
						// adjust scrollbar to new contents
//						if ($('#scrollbar1')) {
//							$('#scrollbar1').tinyscrollbar_update();
//						}
						
						var jqButton = $('a#requestBlock' + idDelim + data.netId);
						jqButton.removeAttr('disabled');
						inProgress(jqButton, false);
						
					}								
				}, 
				"json"
			);
			
			//TODO: write deletion handler and clean up post (above) operations
		}
	});
}

var firstTimeAclRulePaneToggled = true;
function toggleAclRulePane() {
	var addAclRuleForm = $('#addAclRuleForm');
	if ($('#overlayTabContainer').is(':visible')) {
		$('#overlayTabContainer').hide();
		
		$('#' + $.trim($('li.ui-state-active').find('a').html()).toLowerCase()).attr('checked', 'checked');
		
		if (firstTimeAclRulePaneToggled) {
			addAclRuleForm.find('input[name="name"]').each(function() {prepInputField($(this), false, true);});
			
			$('#applyRuleButton').click(function() {
				if (!this.disabled) {
					$('#addAclRuleForm').submit();
				}				
			});
			
			$('div[id^="dk_container_"]').filter('[id$="TypeSelector"]').find('a[data-dk-dropdown-value]').click(function() {
				var jqElem = $(this);
				var rangeType = jqElem.closest('div.dk_container')[0].id.replace('dk_container_', '').replace('TypeSelector', '');
				switch (jqElem.attr('data-dk-dropdown-value')) {
				case "any":
					$('#' + rangeType + 'NetmaskContainer').hide();
					$('#' + rangeType + 'Netmask').attr('disabled', 'disabled');
					$('#' + rangeType + 'IpContainer').hide();
					$('#' + rangeType + 'IpAddress').attr('disabled', 'disabled');
					break;
				case "specific":
					$('#' + rangeType + 'NetmaskContainer').hide();
					$('#' + rangeType + 'Netmask').attr('disabled', 'disabled');
					$('#' + rangeType + 'IpContainer').show();
					$('#' + rangeType + 'IpAddress').removeAttr('disabled');
					break;
				case "network":
					$('#' + rangeType + 'NetmaskContainer').show();
					$('#' + rangeType + 'Netmask').removeAttr('disabled');
					$('#' + rangeType + 'IpContainer').show();
					$('#' + rangeType + 'IpAddress').removeAttr('disabled');
					break;
				}
			});
			
			var ip = osValues.acl.rule.protocol.ip;
			var icmp = osValues.acl.rule.protocol.icmp;
			var tcp = osValues.acl.rule.protocol.tcp;
			var udp = osValues.acl.rule.protocol.udp;
			var all = osValues.acl.rule.portRange.type.all;
			var equal = osValues.acl.rule.portRange.type.equal;
			var greater = osValues.acl.rule.portRange.type.greater;
			var less = osValues.acl.rule.portRange.type.less;
			var range = osValues.acl.rule.portRange.type.range;		
			
			$('#dk_container_protocolSelect').find('a[data-dk-dropdown-value]').click(function() {
				var nodeBin = $('#nodeItemBin');
				var dkOptions = $('#dk_container_portSortSelector').find('ul.dk_options_inner');
				var dkLabel = $('#dk_container_portSortSelector').find('span.dk_label');
				var select = $('#portSortSelector');
				var currSelected = dkOptions.find('li.dk_option_current');
				
				var listItemsToStore, optionsToStore;
				
				nodeBin.find('li').detach().appendTo(dkOptions);
				nodeBin.find('option').detach().appendTo(select);
				
				switch ($(this).attr('data-dk-dropdown-value')) {
				case ip:
					listItemsToStore = dkOptions.find('a').not('[data-dk-dropdown-value="' + all + '"]').closest('li');
					optionsToStore = select.find('option').not('[value="' + all + '"]');
					break;
				case icmp: 
					listItemsToStore = dkOptions.find('a').filter(function() {
						return $(this).attr('data-dk-dropdown-value') != all && $(this).attr('data-dk-dropdown-value') != equal;
					}).closest('li');
					optionsToStore = select.find('option').filter(function() {
						return this.value != all && this.value != equal;
					});
					break;
				case tcp:
				case udp:
				default:
					listItemsToStore = dkOptions.find('a[data-dk-dropdown-value="' + all + '"]').closest('li');
					optionsToStore = select.find('option[value="' + all + '"]');
					break;
				}
				
				listItemsToStore.detach().appendTo(nodeBin);
				optionsToStore.detach().appendTo(nodeBin);			
				
				var newSelected = null;			
				if (currSelected.size() > 0) {
					if (dkOptions.is(currSelected)) {
						newSelected = currSelected;
					}
				}
				if (newSelected == null) {
					newSelected = dkOptions.find('li.dk_option_current');
					if (newSelected.size() == 0) {
						newSelected = dkOptions.find('li').first();
					}
				}
	
				dkLabel.html($.trim(newSelected.first().find('a').html()));
				dkOptions.find('li').removeClass('dk_option_current');
				newSelected.addClass('dk_option_current');
				newSelected.find('a').click();
			});
			
			$('#dk_container_portSortSelector').find('a[data-dk-dropdown-value]').click(function() {
				switch ($(this).attr('data-dk-dropdown-value')) {
				case all:
					$('div.portWrapper').hide().find('input').attr('disabled', 'disabled');
					break;
				case equal:
				case less:
				case greater:
					$('#port1Wrapper').show().find('input').removeAttr('disabled');
					$('div.portWrapper').not('#port1Wrapper').hide().find('input').attr('disabled', 'diabled');
					break;
				case range:
					$('div.portWrapper').show().find('input').removeAttr('disabled');
					break;
				}
			});
					
			firstTimeAclRulePaneToggled = false;
		}
		addAclRuleForm.find('input[name="name"]').focus();
		$('#dk_container_protocolSelect').find('a[data-dk-dropdown-value="' + osValues.acl.rule.protocol.ip + '"]').click();
		$('#dk_container_positionSelect').find('div.dk_options ul li a:contains("available"):first').click();
		$('div.newAclRuleIpBlock').hide();
		$('input.ip').attr("disabled", "disabled");
		
		$('#addACL').show();
		$('#scrollbarAddACL').tinyscrollbar_update();
	} else {
		$('#addACL').hide();
		addAclRuleForm[0].reset();
		$('#overlayTabContainer').show();
	}
	
}

function initManageFirewalls() {
	$('#scrollbarInbound').tinyscrollbar();	
	$('#scrollbarOutbound').tinyscrollbar();
	$('#scrollbarAddACL').tinyscrollbar();
	$('select.default').dropkick();
	$('input.ip').ipaddress();
	
	// Tabs
	$('#tabs').tabs();
	
	$('a.addAclRuleButton').click(function() {
		toggleAclRulePane();
	});
	
	$('a#backToAclRulesButton').click(function() {
		toggleAclRulePane();
	});
	$('a#cancelRuleButton').click(function() {
		toggleAclRulePane();
	});	
	
	$('a.deleteAclRuleButton').click(function() {
		if (!this.disabled && confirm("Are you sure that you want to delete this ACL Rule?")) {
			var ids = this.id.split(idDelim);
			var ruleId = ids[1];
			var netId = ids[2];
			
			inProgress($('div#listedContainer_' + ruleId), true);
			
			$.post("deleteAclRule", {
					ruleId: ruleId,
					netId: netId
				},
				function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
						inProgress($('#listedContainer_' + data.ruleId), false);
					} else {
						var container = $('#listedContainer_' + data.ruleId);
						var tab = container.closest('div[id^="tabs-"]');
						tab.find('div.message').html("The ACL Rule has been deleted.");
						var position = container.find('div.aclRulePosition').html().trim();
						$('#positionSelect').find('option[value="' + position + '"]').removeClass("unavailable").html(position + ": [ available ]");
						$('#dk_container_positionSelect').find('li a[data-dk-dropdown-value="' + position + '"]').html(position + ": [ available ]");
						
						container.remove();
						tab.find('div.mfsb').tinyscrollbar_update();
					}
				},
				"json"
			);
		}
	});
	
	$("#addAclRuleForm").validate({
    	onkeyup: false,
    	errorLabelContainer: '#addAclRuleErrMsg',
    	wrapper: "li",
		rules: {
			name: {
				required: true
			},
			position: {  //TODO: fix form validation
				required: true,
				min: osValues.acl.ranges.position[0],
				max: osValues.acl.ranges.position[1]
			},
			action: {
				required: true,
				validAction: true
			},
			protocol: {
				required: true,
				validProtocol: true
			},
			sourceIpAddress: { 
				ipv4: true				
			},
			sourceNetmask: { 
				ipv4: true
			},
			destIpAddress: {
				ipv4: true
			},
			destNetmask: {
				ipv4: true
			},
			portRangeType: {
				required: true,
				validPortRangeType: true
			},
			port1: {
				min: osValues.acl.ranges.portRange.port1[0],
				max: osValues.acl.ranges.portRange.port1[1]
			},
			port2: {
				min: osValues.acl.ranges.portRange.port2[0],
				max: osValues.acl.ranges.portRange.port2[1]
			},
			type: {
				validAclRuleType: true
			}
		},
		messages: {
			name: {
				required: "Please provide a name for your ACL Rule."
			},
			position: {
				required: "You must choose an available rule position from the list.",
				min: jQuery.format("The ACL Rule position value must be {0} or higher."),
				max: jQuery.format("The ACL Rule position value must be {0} or lower.")
			},
			action: {
				required: "An action must be specified.",
				validAction: "You must choose from the provided, valid Actions."
			},
			protocol: {
				required: "You must specify a Type for this ACL Rule.",
				validAction: "You must choose from the provided, valid Types."
			},
			sourceIpAddress: { 
				ipv4: "Please provide a valid IP address for the Source IP Address. If specifying a network, leave the final octet(s) as zeroes and segregate using the netmask."			
			},
			sourceNetmask: { 
				ipv4: "Please provide a valid Netmask to combine with your Source IP Address to create a network."
			},
			destIpAddress: {
				ipv4: "Please provide a valid IP address for the Destination IP Address. If specifying a network, leave the final octet(s) as zeroes and segregate using the netmask."
			},
			destNetmask: {
				ipv4: "Please provide a valid Netmask to combine with your Destination IP Address to create a network."
			},
			portRangeType: {
				required: "You must specify a Port type for this ACL Rule.",
				validPortRangeType: "You must choose from the provided, valid Port types."
			},
			port1: {
				min: jQuery.format("Port1 must be {0} or higher."),
				max: jQuery.format("Port1 must be {0} or lower.")
			},
			port2: {
				min: jQuery.format("Port2 must be {0} or higher."),
				max: jQuery.format("Port2 must be {0} or lower.")
			},
			type: {
				validAclRuleType: "You must choose from the provided, valid Directions."
			}
			
		},
		submitHandler: function(form) {
			inProgress($('#addACL'), true, true);
			var formData = $(form).serialize();
			$("#addAclRuleForm").attr("disabled", "disabled");
			$('#applyRuleButton').addClass("disabled").attr("disabled", "disabled");
			
		    $.ajax({
				url: "addAclRule",
				type: "POST",
				data: formData,
				dataType: "json",
				success: function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
						inProgress($('#addACL'), false, true);
						$("#addAclRuleForm").removeAttr("disabled");
						$('#applyRuleButton').removeClass("disabled").attr("disabled", "disabled");
					} else {
						var newRule = $('div.aclRule_Template').clone(true);
						newRule.find('div.aclRulePosition_Template').html(data.rule.position).removeClass('aclRulePosition_Template').addClass('aclRulePosition');
						newRule.find('div.aclRuleName_Template').html(data.rule.name).removeClass('aclRuleName_Template').addClass('aclRuleName');
						newRule.find('div.aclRuleProtocol_Template').removeClass('aclRuleProtocol_Template').addClass('aclRuleProtocol').find('span').html(data.rule.protocol);
						
						var portStr = "";
						switch (data.rule.portRange.type) {
						case osValues.acl.rule.portRange.type.greater:
							portStr = ">" + data.rule.portRange.port1;
							break;
						case osValues.acl.rule.portRange.type.less:
							portStr = "<" + data.rule.portRange.port1;
							break;
						case osValues.acl.rule.portRange.type.equal:
							portStr = data.rule.portRange.port1;
							break;
						case osValues.acl.rule.portRange.type.range:
							portStr = data.rule.portRange.port1 + " - " + data.rule.portRange.port2;
							break;
						case osValues.acl.rule.portRange.type.all:
						default:
							portStr = "All";
							break;
						}
						newRule.find('div.aclRulePort_Template').removeClass('aclRulePort_Template').addClass('aclRulePort').find('span').html(portStr);
						newRule.find('span.sourceIp_label_Template').html("Source " + ((data.rule.sourceIpRange != null)? ((data.rule.sourceIpRange.netmask != null)? "Network ID" : "IP") : "IP") + ": ").removeClass('sourceIp_label_Template');
						newRule.find('span.sourceIp_value_Template').html((data.rule.sourceIpRange != null)? ((data.rule.sourceIpRange.ipAddress != null)? data.rule.sourceIpRange.ipAddress : "All") : "All").removeClass('sourceIp_value_Template');
						if (data.rule.sourceIpRange == null || data.rule.sourceIpRange.netmask == null) {
							newRule.find('span.sourceNetmask_label_Template').remove();
							newRule.find('span.sourceNetmask_value_Template + br').remove();
							newRule.find('span.sourceNetmask_value_Template').remove();
						} else {
							newRule.find('span.sourceNetmask_label_Template').removeClass('sourceNetmask_label_Template');
							newRule.find('span.sourceNetmask_value_Template').html(data.rule.sourceIpRange.netmask).removeClass('sourceNetmask_value_Template');
						}
						newRule.find('span.destIp_label_Template').html("Destination " + ((data.rule.destIpRange != null)? ((data.rule.destIpRange.netmask != null)? "Network ID" : "IP") : "IP") + ": ").removeClass('destIp_label_Template');
						newRule.find('span.destIp_value_Template').html((data.rule.destIpRange != null)? ((data.rule.destIpRange.ipAddress != null)? data.rule.destIpRange.ipAddress : "All") : "All").removeClass('destIp_value_Template');
						if (data.rule.destIpRange == null || data.rule.destIpRange.netmask == null) {
							newRule.find('span.destNetmask_label_Template').remove();
							newRule.find('span.destNetmask_value_Template').remove();
						} else {
							newRule.find('span.destNetmask_label_Template').removeClass('destNetmask_label_Template');
							newRule.find('span.destNetmask_value_Template').html(data.rule.destIpRange.netmask).removeClass('destNetmask_value_Template');
						}
						newRule.find('div.aclRuleIps_Template').removeClass('aclRuleIps_Template').addClass('aclRuleIps');
						newRule.find('a.deleteButton_ruleId_netId_Template').attr('id', 'deleteButton' + idDelim + data.rule.id
								+ idDelim + $('#addAclRuleForm').find('input[name="netId"]').val()).removeClass('deleteButton_ruleId_netId_Template');
						var tab = $('#addAclRuleForm').find('input[name="type"][checked="checked"]').attr('id');
						var tabForNewRule = $("#" + tab + "Overview");
						tabForNewRule.append(newRule);
						newRule.attr('id', 'listedContainer' + idDelim + data.rule.id).removeClass('aclRule_Template').removeClass('template');
						
						// add name to position in list and make it unselectable in future
						$('#positionSelect').find('option[value="' + data.rule.position + '"]').addClass("unavailable").html(data.rule.position + ": " + data.rule.name);
						$('#dk_container_positionSelect').find('li a[data-dk-dropdown-value="' + data.rule.position + '"]').html(data.rule.position + ": " + data.rule.name);
						
						inProgress($('#addACL'), false, true);
						$('#cancelRuleButton').click();
						$("#addAclRuleForm").removeAttr("disabled");
						$('#applyRuleButton').removeClass("disabled").removeAttr("disabled");
						userMessage($('#aclRuleMsg' + idDelim + tab), 'The ACL Rule "' + data.rule.name + '" has been created.');
						tabForNewRule.closest('div.sb250').tinyscrollbar_update();
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					inProgress($('#addACL'), false, true);
					$("#addAclRuleForm").removeAttr("disabled");
					$('#applyRuleButton').removeClass("disabled").attr("disabled", "disabled");
				}
			});					
		}
	});
	
}

//function updateScrollbar(sbId) {
//	$('#' + sbId).tinyscrollbar_update();
//}

function initLoadBalancer() {
	$('#tabs').tabs();
	$('select.default').dropkick();
	$('#scrollbarProbes').tinyscrollbar();
	$('#scrollbarAddProbe').tinyscrollbar();
	$('#scrollbarRealServers').tinyscrollbar();	
	$('#scrollbarfarms').tinyscrollbar();
	$('#scrollbarpp').tinyscrollbar();	
	$('#scrollbarvip').tinyscrollbar();
	$('#scrollbarAddServerFarm').tinyscrollbar();
	//$('#scrollbarServerFarms').tinyscrollbar();
	
	//TODO: this works, but it doesn't prevent "default" from being submitted.  Fix this.
	// adjust the generated serverInfo dropdown list to prevent the label from being submitted
	$('li.dk_option_current a[data-dk-dropdown-value="default"]').parent().remove();
	
	$('#realServersTabLink').click(function() {
		$('#scrollbarRealServers').tinyscrollbar_update();
	});
	$('#probesTabLink').click(function() {
		$('#scrollbarProbes').tinyscrollbar_update();
	});
	$('#serverFarmsTabLink').click(function() {
		$('#scrollbarfarms').tinyscrollbar_update();
	});
	$('#persistenceProfilesTabLink').click(function() {
		$('#scrollbarpp').tinyscrollbar_update();
	});
	$('#vipsTabLink').click(function() {
		$('#scrollbarvip').tinyscrollbar_update();
	});
	
//	$('a.dk_toggle').click(function() {
//		setTimeout("updateScrollbar('" + $(this).closest('div[id^="tabs-"]').find('div[id^="scrollbar"]').attr("id") + "')", 1);
//	});

	
/*----------- Real Server -----------------------*/
	// iterate over real servers and store them programmatically in the node so we don't have to do it again
	var allRsList = {};
    $('#realServer_overview').data('nameById', allRsList);
    $('#realServer_overview div.rsListedContainer').each(function(index) {
        allRsList[$(this).attr('id').split(idDelim)[1]] = $(this).find('span.rsNameText').text();
    });	
	
	if ($("#serverInfo")[0].options.length == 1) {
		enableRealServerForm(false);
	}
	
	var realServerNameInput = $('#realServerNameInput');
	//origValue["realServerNameDefault"] = realServerNameInput.val();
	realServerNameInput.data('origValue', realServerNameInput.val());
	realServerNameInput.focus(function() {
		if (realServerNameInput.val() === realServerNameInput.data('origValue')) {
			realServerNameInput.val('');
		}
	});
	realServerNameInput.blur(function() {
		if (realServerNameInput.val() == '') {
			realServerNameInput.val(realServerNameInput.data('origValue'));
		}
	});
	
	$('a.deleteRealServerButton').click(function() {
		if (!this.disabled && !$(this).hasClass('disabled')) {
			if (confirm("Are you sure that you want to delete this real server configuration?")) {
				ids = this.id.split(idDelim);
				var rServerId = ids[1];
				var netId = ids[2];
				inProgress($('#listedContainer' + idDelim + rServerId), true);
				
				$.post("deleteRealServer", {
						rServerId: rServerId,
						netId: netId
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							inProgress($('#listedContainer_' + data.rServerId), false);
						} else {
							var ipSpan = $('span[id^="serverIp' + idDelim + data.rServerId + '"]');
							var serverId = ipSpan.attr("id").split(idDelim)[2];
							$('#serverInfo').append('<option value="' + serverId + idDelim + ipSpan.html() +'">' + ipSpan.html() + '</option>');
							$("#dk_container_serverInfo").find('ul.dk_options_inner').append('<li><a data-dk-dropdown-value="' + 
									serverId + idDelim + ipSpan.html() + '">' + ipSpan.html() + '</a></li>');
							$('#listedContainer' + idDelim + data.rServerId).remove();
							$("#addRealServerForm")[0].reset();
							enableRealServerForm(true);
							userMessage($('#realSvrMsg'), "Your Real Server configuration has been successfully removed.");
							$('#scrollbarProbes').tinyscrollbar_update();
							delete $('#realServer_overview').data('nameById')[rServerId];
						}
					},
					"json"
				);
			}
		}
	});
	
	$("#addRealServerForm").validate({
    	onkeyup: false,
    	errorLabelContainer: '#errMsg',
    	wrapper: "li",
		rules: {
			name: {
				required: true,
				maxlength: maxRealSrvNameLength,
				notEqual: 'Real Server Name',
				pattern: realServerNamePattern
			},
			serverInfo: {  //TODO: fix form validation
				notEqual: "default"
			}
		},
		messages: {
			name: {
				required: "Please provide a name for your Real Server.",
				notEqual: "Please provide a name for your Real Server.",
				maxlength: "Please limit your Real Server name to " + maxRealSrvNameLength + " characters.",
				pattern: "Your Real Server name must be limited to only " + realServerNamePatternDescriptor + "."
			},
			serverInfo: {
				notEqual: "Please select the IP address of the server that you want to link to the new Real Server."
			}
		},
		submitHandler: function(form) {
			enableRealServerForm(false, true);
			var formData = $(form).serialize();
			$("#realServerNameInput")[0].disabled = true;
			$("#serverInfo")[0].disabled = true;
			$("#serviceDropdown")[0].disabled = true;
			$('#addRealServerButton').addClass("disabled");
			
		    $.ajax({
				url: "addRealServer",
				type: "POST",
				data: formData,
				dataType: "json",
				success: function(data) {
					var usrMsg = "";
					if (data.message != null && data.message != "") {
						alert(data.message);
					} else {
						var newRealServer = $('div.realServer_Template').clone(true);
						newRealServer.find('div.realServerName_Template').html(data.realServerName).removeClass('realServerName_Template');
						newRealServer.find('span.realServerIp_Template').html(data.serverIp).attr('id', 'serverIp' + idDelim + data.realServerId
								+ idDelim + data.serverId).removeClass('realServerIp_Template');
						newRealServer.find('div.inService_Template').html(((data.inService)? "In" : "Out of") + " Service").removeClass('inService_Template');
						newRealServer.find('a.deleteRealServerButton_Template').attr('id', 'deleteRealServerButton' + idDelim + data.realServerId
								+ idDelim + data.netId).removeClass('deleteRealServerButton_Template');
						$("#realServer_overview").append(newRealServer);
						newRealServer.attr("id", "listedContainer" + idDelim + data.realServerId).removeClass('realServer_Template').removeClass('template');
						
						usrMsg = 'Your new Real Server has been added.';
						$('#realServer_overview').data('nameById')[data.realServerId] = data.realServerName;
					}
					$("#serverInfo").find('option[value^="' + data.serverId + '"]').remove();
					$("#dk_container_serverInfo").find('li.dk_option_current').remove();
					$("#dk_container_serverInfo").find('span.dk_label').html("IP Address");
					
					if ($("#serverInfo")[0].options.length > 1) {
						enableRealServerForm(true, true);
					} else {
						usrMsg += "<br />All of your servers have been assigned to real servers.";
					}
					$("#addRealServerForm")[0].reset();
					userMessage($('#realSvrMsg'), usrMsg);
					$('#scrollbarProbes').tinyscrollbar_update();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					enableRealServerForm(true, true);
				}
			});					
		}
	});
	
	$('#addRealServerButton').click(function() {
		if (!$('#addRealServerButton').hasClass("disabled")) {
			$('#addRealServerForm').submit();
		}
	});
	
	
/*----------- Probes -----------------------*/
	// iterate over probes and store them programmatically in the node so we don't have to do it again
    var allProbeList = {};
    $('#probes_overview').data('nameById', allProbeList);
     $('#probes_overview form.probeValuesForm').each(function(index) {
        allProbeList[$(this).find('input[name="id"]').val()] = $(this).find('input[name="name"]').val();
    });
	
	$('a.deleteProbeButton').click(function() {
		if (!this.disabled) {
			if (confirm("Are you sure that you want to delete this probe?")) {
				var ids = this.id.split(idDelim);
				var probeId = ids[1];
				var netId = ids[2];
				$(this).removeClass('deleteProbeButton').attr('disabled', 'disabled');
				$('a.editProbeButton').attr('disabled', 'disabled');
				inProgress($('#listedContainer' + idDelim + probeId), true);
				$.post("deleteProbe", { 
						netId: netId,
						probeId: probeId
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							$('#deleteProbeButton' + idDelim + data.probeId + idDelim + data.netId).addClass('deleteProbeButton').removeAttr('disabled');
							$('a.editProbeButton').removeAttr('disabled');
						} else {
							$('#listedContainer' + idDelim + data.probeId).remove();
							userMessage($('#probesMsg'), 'The probe has been successfully removed.');
							delete $('#probes_overview').data('nameById')[data.probeId];
						};					
					}, 
					"json"
				);
			}
		}
	});
	
	function isHttpType(type) {
		return (type === "HTTP" || type === "HTTPS");
	}
	
	function updateProbeFieldAvailability(probeType) {
		if (isHttpType(probeType)) {
			inProgress($('#urlPortLine'), false);
			inProgress($('#matchLine'), false);
			inProgress($('div.methodField'), false);
			inProgress($('div.statusCodeField'), false);
		} else {
			inProgress($('#urlPortLine'), true);
			inProgress($('#matchLine'), true);
			inProgress($('div.methodField'), true);
			inProgress($('div.statusCodeField'), true);
		}
	}
	
	var addProbeFirstShown = true;
	function showProbeEditor(isVisible) {
		if (isVisible) {
			$('#overlayTabContainer').hide();
			$('#overlayAddProbeTopContent').show();
			$('#scrollbarAddProbe').tinyscrollbar_update();
			
			updateProbeFieldAvailability(); // http-related fields should all be disabled whether editing or adding
			if (addProbeFirstShown) {
				$('#addProbeForm div.upSelector').mousedown(function() {
					if (!$('#' + this.id.split(idDelim)[1])[0].disabled) {
						var elem = this;
						deselect();
						var range = getRange(elem, "probe");
						arrowClickChangeInputAmt(elem, 1, range);
						intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, 1, range); }, 125);
					}
				}).bind('mouseup mouseleave', function() {
					if (intervalId) {
						clearInterval(intervalId);
					}
				});
				$('#addProbeForm div.downSelector').mousedown(function() {
					if (!$('#' + this.id.split(idDelim)[1])[0].disabled) {
						var elem = this;
						deselect();
						var range = getRange(elem, "probe");
						arrowClickChangeInputAmt(elem, -1, range);
						intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, -1, range); }, 125);
					}
				}).bind('mouseup mouseleave', function() {
					if (intervalId) {
						clearInterval(intervalId);
					}
				});
				
				$('#cancelProbeButton').click(function() {	
					$('#addProbeErrMsg').html("");
					$('#overlayAddProbeTopContent').hide();
					$('#addProbeForm')[0].reset();
					$('#addProbeForm').find('li.dk_option_current').removeClass('dk_option_current'); //TODO: Come back and make this "reset" the dropkick fields
					inProgress($('#addProbeForm'), false);
					$('#overlayTabContainer').show();
				});
				
				$('#applyProbeButton').click(function() {
					if (!this.disabled) {
						$('#addProbeForm').submit();
					}
				});
				
				$('#backToProbesButton').click(function() {
					$('#cancelProbeButton').click();
				});
				
				
			}
			addProbeFirstShown = false;
			prepInputField($("#newProbeName"), false, true, "probe");
			prepInputField($("#requestUrlInput"), false, true, "probe");
			prepInputField($("#probePortInput"), true, true, "probe");
			prepInputField($("#probeIntervalSecondsInput"), true, true, "probe");
			prepInputField($("#lowerBoundInput"), true, true, "probe");
			prepInputField($("#upperBoundInput"), true, true, "probe");
			prepInputField($("#maxReplyWaitSecondsInput"), true, true, "probe");
			prepInputField($("#failedProbeIntervalSecondsInput"), true, true, "probe");
			prepInputField($("#errorCountBeforeServerFailInput"), true, true, "probe");
			prepInputField($("#successCountBeforeServerEnableInput"), true, true, "probe");
		}
	}
	
	$('#addProbeButton').click(function() {
		$('#probeEditAction').html('Add');
		
		$('#dk_container_typeDropDown').find('a[data-dk-dropdown-value]').click(function() {
			updateProbeFieldAvailability($(this).attr('data-dk-dropdown-value'));
		});
		showProbeEditor(true);
		$('#newProbeName').focus();
		
		$("#addProbeForm").validate({
	    	onkeyup: false,
	    	errorLabelContainer: '#addProbeErrMsg',
	    	wrapper: "li",
			rules: {
				name: {
					required: true,
					notEqual: 'Insert Probe Name Here',
					pattern: osValues.probe.name.pattern
				},
				type: {  //TODO: fix form validation
					validProbeType: true
				},
				requestUrl: {
					url: true
				},
				probeIntervalSeconds: {
					notEqual: "default",
					min: osValues.probe.ranges.probeIntervalSeconds[0],
					max: osValues.probe.ranges.probeIntervalSeconds[1]
				},
				errorCountBeforeServerFail: { 
					notEqual: "default",
					min: osValues.probe.ranges.errorCountBeforeServerFail[0],
					max: osValues.probe.ranges.errorCountBeforeServerFail[1]				
				},
				successCountBeforeServerEnable: { 
					notEqual: "default",
					min: osValues.probe.ranges.successCountBeforeServerEnable[0],
					max: osValues.probe.ranges.successCountBeforeServerEnable[1]
				},
				failedProbeIntervalSeconds: {
					notEqual: "default",
					min: osValues.probe.ranges.failedProbeIntervalSeconds[0],
					max: osValues.probe.ranges.failedProbeIntervalSeconds[1]
				},
				maxReplyWaitSeconds: {
					notEqual: "default",
					min: osValues.probe.ranges.maxReplyWaitSeconds[0],
					max: osValues.probe.ranges.maxReplyWaitSeconds[1]
				},
				lowerBoundInput: {
					required: function(elem) {
						return (isHttpType($('#typeDropDown').val()));
					},
					min: osValues.probe.ranges.lowerBound[0],
					max: osValues.probe.ranges.lowerBound[1]
				},
				upperBoundInput: {
					required: function(elem) {
						return (isHttpType($('#typeDropDown').val()));
					},
					min: osValues.probe.ranges.upperBound[0],
					max: osValues.probe.ranges.upperBound[1]
				},
				requestMethod: {
					required: function(elem) {
						return (isHttpType($('#typeDropDown').val()));
					},
					validRequestMethod: true
				},
				matchContent: {
					required: function(elem) {
						return (isHttpType($('#typeDropDown').val()));
					},
					maxlength: osValues.probe.matchContent.maxLength,
					pattern: osValues.probe.matchContent.pattern
				}
			},
			messages: {
				name: {
					required: "Please provide a name for your Probe.",
					notEqual: "Please provide a name for your Probe.",
					pattern: "Your Probe name must be " + osValues.probe.name.patternDescriptor + "."
				},
				type: {
					validProbeType: "Your Probe type must be one of the following: " + osValues.probe.validTypes + "."
				},
				requestUrl: {
					url: "The new Probe URL you have specified is not formatted as a valid URL."
				},
				probeIntervalSeconds: {
					notEqual: "The Probe Interval value must be a number of seconds between " + osValues.probe.ranges.probeIntervalSeconds[0] + " and " + osValues.probe.ranges.probeIntervalSeconds[1] + ", inclusive.",
					min: jQuery.format("The Probe Interval value must be {0} (seconds) or more."),
					max: jQuery.format("The Probe Interval value must be {0} (seconds) or fewer.")
				},
				errorCountBeforeServerFail: { 
					notEqual: "The Number of Error Responses to Disable a Server value must be a number between " + osValues.probe.ranges.errorCountBeforeServerFail[0] + " and " + osValues.probe.ranges.errorCountBeforeServerFail[1] + ", inclusive.",
					min: jQuery.format("The Number of Error Responses to Disable a Server value must be {0} or more."),
					max: jQuery.format("The Number of Error Responses to Disable a Server value must be {0} or fewer.")				
				},
				successCountBeforeServerEnable: { 
					notEqual: "The Number of Successful Responses to Re-enable a Server value must be a number between " + osValues.probe.ranges.successCountBeforeServerEnable[0] + " and " + osValues.probe.ranges.successCountBeforeServerEnable[1] + ", inclusive.",
					min: jQuery.format("The Number of Successful Responses to Re-enable a Server value must be {0} or more."),
					max: jQuery.format("The Number of Successful Responses to Re-enable a Server value must be {0} or fewer.")
				},
				failedProbeIntervalSeconds: {
					notEqual: "The Failed Probe Interval value must be a number of seconds between " + osValues.probe.ranges.failedProbeIntervalSeconds[0] + " and " + osValues.probe.ranges.failedProbeIntervalSeconds[1] + ", inclusive.",
					min: jQuery.format("The Failed Probe Interval value must be {0} (seconds) or more."),
					max: jQuery.format("The Failed Probe Interval value must be {0} (seconds) or fewer.")
				},
				lowerBoundInput: {
					required: "You must specify an Accepted Status Code lower bound when new Probe Type is set to " + $('#typeDropDown').val() + ".",
					min: jQuery.format("The Accepted Status Code lower bound value must be {0} or more."),
					max: jQuery.format("The Accepted Status Code lower bound value must be {0} or fewer.")
				},
				upperBoundInput: {
					required: "You must specify an Accepted Status Code upper bound when new Probe Type is set to " + $('#typeDropDown').val() + ".",
					min: jQuery.format("The Accepted Status Code upper bound value must be {0} or more."),
					max: jQuery.format("The Accepted Status Code upper bound value must be {0} or fewer.")
				},
				requestMethod: {
					required: "You must specify a Probe Method when new Probe Type is set to " + $('#typeDropDown').val() + ".",
					validRequestMethod: "Your Probe Method must be one of the following: " + osValues.probe.validMethods + "."
				},
				matchContent: {
					required: "You must specify content to match when new Probe Type is set to " + $('#typeDropDown').val() + ".",
					maxlength: "The content to match cannot exceed {0} characters in length.",
					pattern: "The content to match must be " + osValues.probe.matchContent.patternDescriptor + "."
				}
				
			},
			submitHandler: function(form) {
				inProgress($('#scrollbarAddProbe'), true, true);
				var formData = $(form).serialize();
				$("#addProbeForm").attr("disabled", "disabled");
				$('#applyProbeButton').addClass("disabled").attr("disabled", "disabled");
				
			    $.ajax({
					url: "addProbe",
					type: "POST",
					data: formData,
					dataType: "json",
					success: function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
						} else {
							var newProbe = $('div.probe_Template').clone(true);
							newProbe.find('div.probeName_Template').html(data.name).attr('id', 'listedContainer_' + data.probeId).removeClass('probeName_Template');
							newProbe.find('div.probeType_Template').html(data.type).removeClass('probeType_Template');
							newProbe.find('div.probeMethod_Template').html((data.method == null)? "n/a" : data.method).removeClass('probeMethod_Template');
							newProbe.find('div.probeInterval_Template').html(data.interval).removeClass('probeInterval_Template');
							newProbe.find('div.probeStatusRange_Template').html(((data.lowerBound != null) && (data.upperBound != null))? 
									data.lowerBound + " - " + data.upperBound : "n/a").removeClass('probeStatusRange_Template');
							newProbe.find('a.deleteProbeButton_Template').attr('id', 'deleteProbeButton' + idDelim + data.probeId
									+ idDelim + data.netId).removeClass('deleteProbeButton_Template');
							newProbe.find('a.editProbeButton_Template').attr('id', 'editProbeButton' + idDelim + data.probeId
									+ idDelim + data.netId).removeClass('editProbeButton_Template');
							$("#probes_overview").append(newProbe);
							newProbe.attr('id', 'listedContainer' + idDelim + data.probeId).removeClass('div.probe_Template').removeClass('template');
							$('#cancelProbeButton').click();
							userMessage($('#probesMsg'), 'The probe "' + data.name + '" has been created.');
							$('#scrollbarProbes').tinyscrollbar_update();
							$('#probes_overview').data('nameById')[data.probeId] = data.name;
						}
						inProgress($('#scrollbarAddProbe'), false, true);
						$("#addProbeForm").removeAttr("disabled");
						$('#applyProbeButton').removeClass("disabled").attr("disabled", "disabled");
					},
					error: function(jqXHR, textStatus, errorThrown) {
						alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
						inProgress($('#scrollbarAddProbe'), false, true);
						$("#addProbeForm").removeAttr("disabled");
						$('#applyProbeButton').removeClass("disabled").attr("disabled", "disabled");
					}
				});					
			}
		});
	});
	
	$('a.editProbeButton').click(function() {
		if (!this.disabled) {
			var ids = this.id.split(idDelim);
			var probeId = ids[1];
			
			$('#probeEditAction').html('Edit');
			var sourceForm = $('#probeValues' + idDelim + probeId);
			$('#modifyingProbeId').val(probeId);
			$('#newProbeName').val(sourceForm.find('input[name="name"]').val());
			var probeType = sourceForm.find('input[name="type"]').val();
			$('#typeDropDown').val(probeType);
			inProgress($('div.nameField'), true);
			inProgress($('div.typeField'), true);
			$('#probeIntervalSecondsInput').val(sourceForm.find('input[name="probeIntervalSeconds"]').val());
			$('#maxReplyWaitSecondsInput').val(sourceForm.find('input[name="maxReplyWaitSeconds"]').val());
			$('#failedProbeIntervalSecondsInput').val(sourceForm.find('input[name="failedProbeIntervalSeconds"]').val());
			$('#errorCountBeforeServerFailInput').val(sourceForm.find('input[name="errorCountBeforeServerFail"]').val());
			$('#successCountBeforeServerEnableInput').val(sourceForm.find('input[name="successCountBeforeServerEnable"]').val());
			
			if (isHttpType(probeType)) {
				$('#requestMethodDropDown').val(sourceForm.find('input[name="requestMethod"]').val());
				$('#requestUrlInput').val(sourceForm.find('input[name="requestUrl"]').val());
				$('#probePortInput').val(sourceForm.find('input[name="port"]').val());
				$('#matchContentText').val(sourceForm.find('input[name="matchContent"]').val());			
				$('#lowerBoundInput').val(sourceForm.find('input[name="lowerBound"]').val());
				$('#upperBoundInput').val(sourceForm.find('input[name="upperBound"]').val());
			}			
			
			showProbeEditor(true);
			
			$("#addProbeForm").validate({
		    	onkeyup: false,
		    	errorLabelContainer: '#addProbeErrMsg',
		    	wrapper: "li",
				rules: {
					probeIntervalSeconds: {
						notEqual: "default",
						min: osValues.probe.ranges.probeIntervalSeconds[0],
						max: osValues.probe.ranges.probeIntervalSeconds[1]
					},
					errorCountBeforeServerFail: { 
						notEqual: "default",
						min: osValues.probe.ranges.errorCountBeforeServerFail[0],
						max: osValues.probe.ranges.errorCountBeforeServerFail[1]				
					},
					successCountBeforeServerEnable: { 
						notEqual: "default",
						min: osValues.probe.ranges.successCountBeforeServerEnable[0],
						max: osValues.probe.ranges.successCountBeforeServerEnable[1]
					},
					failedProbeIntervalSeconds: {
						notEqual: "default",
						min: osValues.probe.ranges.failedProbeIntervalSeconds[0],
						max: osValues.probe.ranges.failedProbeIntervalSeconds[1]
					},
					maxReplyWaitSeconds: {
						notEqual: "default",
						min: osValues.probe.ranges.maxReplyWaitSeconds[0],
						max: osValues.probe.ranges.maxReplyWaitSeconds[1]
					}
				},
				messages: {
					errorCountBeforeServerFail: { 
						notEqual: "The Number of Error Responses to Disable a Server value must be a number between " + osValues.probe.ranges.errorCountBeforeServerFail[0] + " and " + osValues.probe.ranges.errorCountBeforeServerFail[1] + ", inclusive.",
						min: jQuery.format("The Number of Error Responses to Disable a Server value must be {0} or more."),
						max: jQuery.format("The Number of Error Responses to Disable a Server value must be {0} or fewer.")				
					},
					probeIntervalSeconds: {
						notEqual: "The Probe Interval value must be a number of seconds between " + osValues.probe.ranges.probeIntervalSeconds[0] + " and " + osValues.probe.ranges.probeIntervalSeconds[1] + ", inclusive.",
						min: jQuery.format("The Probe Interval value must be {0} (seconds) or more."),
						max: jQuery.format("The Probe Interval value must be {0} (seconds) or fewer.")
					},
					successCountBeforeServerEnable: { 
						notEqual: "The Number of Successful Responses to Re-enable a Server value must be a number between " + osValues.probe.ranges.successCountBeforeServerEnable[0] + " and " + osValues.probe.ranges.successCountBeforeServerEnable[1] + ", inclusive.",
						min: jQuery.format("The Number of Successful Responses to Re-enable a Server value must be {0} or more."),
						max: jQuery.format("The Number of Successful Responses to Re-enable a Server value must be {0} or fewer.")
					},
					failedProbeIntervalSeconds: {
						notEqual: "The Failed Probe Interval value must be a number of seconds between " + osValues.probe.ranges.failedProbeIntervalSeconds[0] + " and " + osValues.probe.ranges.failedProbeIntervalSeconds[1] + ", inclusive.",
						min: jQuery.format("The Failed Probe Interval value must be {0} (seconds) or more."),
						max: jQuery.format("The Failed Probe Interval value must be {0} (seconds) or fewer.")
					},
					maxReplyWaitSeconds: {
						notEqual: "The Request Timeout value must be a number of seconds between " + osValues.probe.ranges.maxReplyWaitSeconds[0] + " and " + osValues.probe.ranges.maxReplyWaitSeconds[1] + ", inclusive.",
						min: jQuery.format("The Request Timeout value must be {0} (seconds) or more."),
						max: jQuery.format("The Request Timeout value must be {0} (seconds) or fewer.")
					}
				},
				submitHandler: function(form) {
					inProgress($('#scrollbarAddProbe'), true, true);
					$('#addProbeErrMsg').html(workingImg(37)).show();
					var formData = "";
					var idData = "";
					var changedFields = {};
					var probeId = $('#modifyingProbeId').val();
					var initialValFormSelector = '#probeValues' + idDelim + probeId;
					$('#addProbeForm').find(':input').not('[disabled]').each(function() {
						if (this.name === "netId" || this.name === "probeId") {
							idData += ((idData == "")? "" : "&") + $(this).serialize();
						} else {
							var inputSelector = 'input[name=' + this.id.replace("Input", "") + ']';
							var initialVal = $(initialValFormSelector).find(inputSelector).val();
							if (!(this.value === initialVal)) {
								formData += ((formData == "")? "" : "&") + $(this).serialize();
								changedFields[this.id.replace("Input", "")] = this.value;
							}
						}
					});
					
					if (formData != "") {
						$("#addProbeForm").attr("disabled", "disabled");
						$('#applyProbeButton').addClass("disabled").attr("disabled", "disabled");
						
					    $.ajax({
							url: "editProbe",
							type: "POST",
							data: formData + "&" + idData,
							dataType: "json",
							success: function(data) {
								if (data.message != null && data.message != "") {
									alert(data.message);
								} else {
									var probe = $('#probeValues' + idDelim + $('#modifyingProbeId').val());
									$.each(changedFields, function(key, value) {
										probe.find('input[name=' + key + ']').val(value);
										if (key === "probeIntervalSeconds") {
											$('#' + key + idDelim + $('#modifyingProbeId').val()).html(value);
										} else if (key === "name") {
											$('#probes_overview').data('nameById')[data.probeId] = value;
										}
									});
									$('#cancelProbeButton').click();
									userMessage($('#probesMsg'), 'The probe "' + $(initialValFormSelector).find('input[name="name"]').val() + '" has been updated.');
									$('#scrollbarProbes').tinyscrollbar_update();
								}
								inProgress($('#scrollbarAddProbe'), false, true);
								$("#addProbeForm").removeAttr("disabled");
								$('#applyProbeButton').removeClass("disabled").attr("disabled", "disabled");
							},
							error: function(jqXHR, textStatus, errorThrown) {
								alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
								inProgress($('#scrollbarAddProbe'), false, true);
								$("#addProbeForm").removeAttr("disabled");
								$('#applyProbeButton').removeClass("disabled").attr("disabled", "disabled");
							}
						});	
					} else {
						userMessage($('#addProbeErrMsg'), "The form cannot be submitted without changes. Please make one or more changes and then submit.");
						inProgress($('#scrollbarAddProbe'), false, true);
					}
				}
			});
		}
	});
	
/*----------- Server Farms -----------------------*/
	// iterate over server farms and store them programmatically in the node so we don't have to do it again
	var allSfList = {};
    $('#serverFarms_overview').data('nameById', allSfList);
    $('#serverFarms_overview div.listedContainer').not('div.heading').each(function(index) {
        allSfList[$(this).attr('id').split(idDelim)[1]] = $(this).find('span.sfNameText').text();
    });	
	
	$('#sfNewRsPortInput').data('defaultValue', $('#sfNewRsPortInput').val());
	
	$('a.deleteServerFarmButton').click(function() {
		if (!this.disabled) {
			if (confirm("Are you sure that you want to delete this Server Farm?")) {
				var ids = this.id.split(idDelim);
				var farmId = ids[1];
				var netId = ids[2];
				$(this).removeClass('deleteServerFarmButton').attr('disabled', 'disabled');
				inProgress($('#listedContainer' + idDelim + farmId), true);
				$.post("serverfarm/delete", { 
						netId: netId,
						farmId: farmId
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							$('#deleteServerFarmButton' + idDelim + data.id + idDelim + data.netId).addClass('deleteServerFarmButton').removeAttr('disabled');
							inProgress($('#listedContainer' + idDelim + farmId), false);
						} else {
							$('#listedContainer' + idDelim + data.id).remove();
							delete $('#serverFarms_overview').data('nameById')[data.id];
							userMessage($('#farmsMsg'), 'The Server Farm has been successfully removed.');
						};					
					}, 
					"json"
				);
			}
		}
	});
	
	var addServerFarmFirstShown = true;
	function showServerFarmEditor(editing) { //isVisible, editing) {
		var theForm = $('#addServerFarmForm');
		
		//if (isVisible) {
			$('#overlayTabContainer').hide();
			$('#overlayAddServerFarmTopContent').show();
			
			if (addServerFarmFirstShown) {
				/* place up-down arrows				
				//var inputBox = $("#serverFarmPortInput");
				theForm.find('div.upDownSelectorContainer').each(function() {
				    var inputBox = $('#' + this.id.split(idDelim)[0] + 'Input');
				    $(this).css("left", inputBox.width() + parseInt(inputBox.css("padding-left").replace(/\D/g, '')));
				});
				*/
				
				theForm.find('div.upSelector').each(function() {
				    $(this).mousedown(function() {
				        if (!$('#' + this.id.split(idDelim)[1]).get(0).disabled) {
    						var elem = this;
    						deselect();
    						var range = getRange(elem, "serverFarm");
    						arrowClickChangeInputAmt(elem, 1, range);
    						intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, 1, range); }, 125);
    					}
    				}).bind('mouseup mouseleave', function() {
    					if (intervalId) {
    						clearInterval(intervalId);
    					}
				    });
				});
				theForm.find('div.downSelector').each(function() {
				    $(this).mousedown(function() {
    					if (!$('#' + this.id.split(idDelim)[1]).get(0).disabled) {
    						var elem = this;
    						deselect();
    						var range = getRange(elem, "serverFarm");
    						arrowClickChangeInputAmt(elem, -1, range);
    						intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, -1, range); }, 125);
    					}
    				}).bind('mouseup mouseleave', function() {
    					if (intervalId) {
    						clearInterval(intervalId);
    					}
    				});
    			});
    			
    			$('input.serverFarmInput').each(function() {
    			    prepInputField($(this), true, true, 'serverFarm');
    			});
				
				$('input.specificPort').click(function() {
					inProgress($('#' + this.id.split(idDelim)[0] + idDelim + 'Input').closest('div.singleLineEntrySegment'), false, false);
				});
				
				$('input.anyPort').click(function() {
					inProgress($('#' + this.id.split(idDelim)[0] + idDelim + 'Input').closest('div.singleLineEntrySegment'), true, false);
				});
				
				$('#specificProbe').click(function() {
					inProgress($('#serverFarmProbe').closest('div.singleLineEntrySegment'), false, false);
				});
				
				$('#noProbe').click(function() {
					inProgress($('#serverFarmProbe').closest('div.singleLineEntrySegment'), true, false);
				});
				
				$('#cancelServerFarmButton').click(function() {
					$('#addServerFarmErrMsg').html("");
					$('#overlayAddServerFarmTopContent').hide();
					theForm[0].reset();
					$.fn.dropkick('reset'); // reset dropkick fields to default values
					$('#dk_container_serverFarmPredictor a[data-dk-dropdown-value]').unbind('click.realtime');
					inProgress(theForm, false);
					$('#overlayTabContainer').show();
				});
				
				$('#applyServerFarmButton').click(function() {
					if (!this.disabled) {
						theForm.submit();
					}
				});
				
				$('#backToServerFarmsButton').click(function() {
					$('#cancelServerFarmButton').click();
				});
				
				addServerFarmFirstShown = false;
				
			}
			
			if (editing) {
				theForm.find('.addField').hide().filter(":input").attr("disabled", "disabled");
				theForm.find('.editField').show(); //.filter(":input").removeAttr("disabled");
				$('#serverFarmEditAction').html('Edit');
				$('#sfRealServerBox').hide().filter(":input").attr("disabled", "disabled");
				$('#sfProbeBox').hide().filter(":input").attr("disabled", "disabled");
				
				// update predictor drop-down in editor
				var pred = $('#listedContainer' + idDelim + $('#modifyingServerFarmId').val() + ' .sfPredictorColumn').attr('title');
				var predDesc = $('#listedContainer' + idDelim + $('#modifyingServerFarmId').val() + ' .sfPredictorColumn').text();
				$('#dk_container_serverFarmPredictor span.dk_label').text(predDesc);
				$('#dk_container_serverFarmPredictor li.dk_option_current').removeClass('dk_option_current');
				$('#dk_container_serverFarmPredictor a[data-dk-dropdown-value="' + pred + '"]').addClass('dk_option_current');
				$('#serverFarmPredictor').val(pred);
				
				// configure predictor changes to happen in realtime
				var currPredictorVal = $('#serverFarmPredictor').val();
				$('#dk_container_serverFarmPredictor a[data-dk-dropdown-value]').bind('click.realtime', function() {
					if ($(this).attr('data-dk-dropdown-value') !== currPredictorVal) {
						inProgress($('#dk_container_serverFarmPredictor'), true, false);
						$.post("serverfarm/modifypredictor",
							{
								netId: theForm.find('input[name="netId"]').val(),
								sfId: $('#modifyingServerFarmId').val(),
								predictor: $(this).attr('data-dk-dropdown-value')
							},
							function(data) {
								if (data.message != null && data.message != "") {
									alert(data.message);
								} else {
									var newPred = $('#dk_container_serverFarmPredictor span.dk_label').text();
									$('#listedContainer' + idDelim + data.id + ' sfPredictorColumn').text(newPred).attr('title', newPred);
								}													
								inProgress($('#dk_container_serverFarmPredictor'), false, false);
							},
							'json'
						);
						currPredictorVal = $(this).attr('data-dk-dropdown-value');
					}
				});
			} else {
				theForm.find('.editField').hide().filter(":input").attr("disabled", "disabled");
				theForm.find('.addField').show().filter(":input").removeAttr("disabled");
				$('#serverFarmEditAction').html('Add');
				$('#sfRealServerBox').show().filter(":input").removeAttr("disabled");
				$('#sfProbeBox').show().filter(":input").removeAttr("disabled");
				$('#serverFarmPort_any').click();
				
				// unhide buttons
				$('#applyServerFarmButton').show();
				$('#cancelServerFarmButton').show();
			}
			
			$('#anyPort').click();
			$('#noProbe').click();
			prepInputField($("#serverFarmName"), false, true);
			prepInputField($("#serverFarmPortInput"), true, true, "serverFarm");
			//theForm.find('select').dropkick();
		//}
	}
	
	$('#addServerFarmButton').click(function() {
		if (!this.disabled) {
			showServerFarmEditor(false);
			$('#scrollbarAddServerFarm').tinyscrollbar_update();
			$('#serverFarmName').focus();
			
			$("#addServerFarmForm").validate({
		    	onkeyup: false,
		    	errorLabelContainer: '#addServerFarmErrMsg',
		    	wrapper: "li",
				rules: {
					name: {
						required: true,
						notEqual: 'Server Farm Name Here',
						pattern: osValues.serverFarm.name.pattern
					},
					predictor: {
						valid: osValues.serverFarm.validPredictors
					},
					port: {
						required: function(elem) {
							return $('#serverFarmPort_specific').attr('checked') != undefined;
						},
						min: osValues.serverFarm.ranges.port[0],
						max: osValues.serverFarm.ranges.port[1]
					},
					probeId: { 
						required: function(elem) {
							return $('#specificProbe').attr('checked') != undefined;
						}				
					}
				},
				messages: {
					name: {
						required: "Please provide a name for your Server Farm.",
						notEqual: "Please provide a name for your Server Farm.",
						pattern: "Your Server Farm name must be " + osValues.serverFarm.name.patternDescriptor + "."
					},
					predictor: {
						validProbeType: "Your Server Farm type must be one of the following: " + osValues.serverFarm.validPredictors + "."
					},
					port: {
						required: "You must either specify a Port or indicate that Any port is acceptable.",
						min: jQuery.format("The Port must be {0} or higher."),
						max: jQuery.format("The Port must be {0] or lower.")
					},
					probeId: {
						notEqual: "You must either specify an initial Probe or indicate that there is No Initial Probe."
					}
					
				},
				submitHandler: function(form) {
					inProgress($('#scrollbarAddServerFarm'), true, true);
					var formData = $(form).serialize();
					$("#addServerFarmForm").attr("disabled", "disabled");
					$('#applyServerFarmButton').addClass("disabled").attr("disabled", "disabled");
					
				    $.ajax({
						url: "serverfarm/add",
						type: "POST",
						data: formData,
						dataType: "json",
						success: function(data) {
							if (data.message != null && data.message != "") {
								alert(data.message);
							} else {
								var newServerFarm = $('div.serverFarm_Template').clone(true);
								newServerFarm.find('span.sfNameText').text(data.component.name);
								newServerFarm.find('div.serverFarmName_Template').removeClass('serverFarmName_Template');
								newServerFarm.find('div.serverFarmPredictor_Template').html(data.component.predictor.replace(idDelim, " ").toLowerCase()).css('text-transform', 'capitalize').removeClass('serverFarmPredictor_Template');
								newServerFarm.find('a.deleteServerFarmButton_Template').attr('id', 'deleteServerFarmButton' + idDelim + data.id
										+ idDelim + data.netId).removeClass('deleteServerFarmButton_Template');
								newServerFarm.find('a.editServerFarmButton_Template').attr('id', 'editServerFarmButton' + idDelim + data.id
										+ idDelim + data.netId).removeClass('editServerFarmButton_Template');
								$("#serverFarms_overview").append(newServerFarm);
								newServerFarm.attr('id', 'listedContainer' + idDelim + data.id).removeClass('div.serverFarm_Template').removeClass('template');
								$('#cancelServerFarmButton').click();
								userMessage($('#serverFarmsMsg'), 'The serverFarm "' + data.component.name + '" has been created.');
								$('#scrollbarfarms').tinyscrollbar_update();
							}
							inProgress($('#scrollbarAddServerFarm'), false, true);
							$("#addServerFarmForm").removeAttr("disabled");
							$('#applyServerFarmButton').removeClass("disabled").attr("disabled", "disabled");
						},
						error: function(jqXHR, textStatus, errorThrown) {
							alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
							inProgress($('#scrollbarAddServerFarm'), false, true);
							$("#addServerFarmForm").removeAttr("disabled");
							$('#applyServerFarmButton').removeClass("disabled").attr("disabled", "disabled");
						}
					});					
				}
			});
		}
	});
    
    function addOrIgnoreOption(jqSel, currList, currId, currName) {
        if(!currList || !currList[currId]) {
            $('<option value="' + currId + '">' + currName + '</option>').appendTo(jqSel);
        }
    }
    
    function sfSetAddButton(jqSfElemList, jqElemList, jqAddButton, elemStr) {
    	var msg = null;
    	jqAddButton.show();
    	if ($.assocArraySize(jqSfElemList.data('nameById')) < $.assocArraySize(jqElemList.data('nameById'))) {
    		msg = 'Add ' + elemStr + ' to this Server Farm.';
	    	jqAddButton.removeAttr('disabled').removeClass('disabled').attr('title', msg);
    	} else {
	    	msg = 'All available ' + elemStr + 's have been assigned to this Server Farm.';
	    	jqAddButton.attr('disabled', 'disabled').addClass('disabled').attr('title', msg);
    	}
    }
    
    function sfRsAddButton() {
    	sfSetAddButton($('#sfRealServerList'), $('#realServer_overview'), $('#sfRealServerList a.sfAddRealServer'), "Real Server");
    }
    
    function sfProbeAddButton() {
    	sfSetAddButton($('#sfProbeList'), $('#probes_overview'), $('#sfProbeList a.sfAddProbe'), "Probe");
    }
    
    function resetAddSfRealServer() {
    	$('#sfNewRsSubmitButtonContainer a').removeClass('working').addClass('button').removeAttr('disabled');
    	inProgress($('#sfNewRsFormWrapper').children().not('#sfNewRsSubmitButtonContainer'), false, true);
    	$('#sfRealServerList div.sfRealServerRow').not('.heading,.sfTemplates').find('a.sfDeleteRealServer').removeAttr('disabled').removeClass('disabled');
        $('#sfNewRsFormWrapper').hide();
        $('#sfNewRsSelectContainer div.dk_container').remove();
        $('#sfNewRsSelectContainer select.sfRealServerIdToAdd').remove();
        $('<select id="rsSel_' + (new Date()).valueOf() + '" class="sfRealServerIdToAdd"></select>').appendTo('#sfNewRsSelectContainer');
        $('#sfNewRsPort_any').click();
        $('#sfNewRsPortInput').val($('#sfNewRsPortInput').data('defaultValue'));
        
        sfRsAddButton();
    }
    
    function resetAddSfProbe() {
    	$('#sfNewProbeSubmitButtonContainer a').removeClass('working').addClass('button').removeAttr('disabled');
    	$('#sfProbeList div.sfProbeRow').not('.heading,.sfTemplates').find('a.sfDeleteProbe').removeAttr('disabled').removeClass('disabled');
        inProgress($('#sfNewProbeFormWrapper').children().not('#sfNewProbeSubmitButtonContainer'), false, true);
        $('#sfNewProbeFormWrapper').hide();
        $('#sfNewProbeToAddContainer div.dk_container').remove();
        $('#sfNewProbeToAddContainer select.sfProbeIdToAdd').remove();
        $('<select id="probeSel_' + (new Date()).valueOf() + '" class="sfProbeIdToAdd"></select>').appendTo('#sfNewProbeToAddContainer');
        
        sfProbeAddButton();
    }
    
    function sfDeleteRealServer_click() {
    	if (!$(this).attr('disabled')) {
	        var row = $(this).closest('div.sfRealServerRow');
	        $(this).removeClass('button').addClass('working').attr('disabled', 'disabled');
	        inProgress(row.children().not('div.sfRealServerDeleteField'), true, true);
	        var rsId = row.attr('id').split(idDelim)[1];
	        if (confirm('Are you sure that you want to remove real server "' + row.find('div.sfRealServerNameField').text() + '" from this Server Farm?')) {
	            var port = row.find('div.sfRealServerPortField').text();
	            var params = {
	                rsId: rsId,
	                sfId: $('#modifyingServerFarmId').val(),
	                netId: $('#addServerFarmForm').find('input[name="netId"]').val()
	            };
	            if (port !== "") {
	                params.port = port;
	            }
	            
	            $.post("serverfarm/removerealserver",
	                params,
	                function(data) {
	                    if (data.message != null && data.message != "") {
	                        alert(data.message);                                                 
	                        inProgress(row.children().not('div.sfRealServerDeleteField'), false, true);
	                        $(this).removeClass('working').addClass('button').removeAttr('disabled');
	                    } else {
	                        row.remove();
	                        if ($('#sfRealServerList').data('nameById')) {
	                            delete $('#sfRealServerList').data('nameById')[rsId];
	                        }
	                        sfRsAddButton();
	                        $('#scrollbarAddServerFarm').tinyscrollbar_update();
	                    }
	                },
	                'json'
	            );
	        } else {
	        	inProgress(row.children().not('div.sfRealServerDeleteField'), false, true);
	            $(this).removeClass('working').addClass('button').removeAttr('disabled');
	        }
    	}
    }
    
    function sfDeleteProbe_click() {
    	if (!$(this).attr('disabled')) {
	        var row = $(this).closest('div.sfProbeRow');
	        $(this).removeClass('button').addClass('working').attr('disabled', 'disabled');
	        inProgress(row, true, true);
	        inProgress(row.children().not('div.sfProbeDeleteField'), true, true);
	        var pId = row.attr('id').split(idDelim)[1];
	        if (confirm('Are you sure that you want to remove probe "' + row.find('div.sfProbeNameField').text() + '" from this Server Farm?')) {
	            $.post("serverfarm/removeprobe",
	                {
	                    pId: pId,
	                    sfId: $('#modifyingServerFarmId').val(),
	                    netId: $('#addServerFarmForm').find('input[name="netId"]').val()
	                },
	                function(data) {
	                    if (data.message != null && data.message != "") {
	                        alert(data.message);                                                 
	                        inProgress(row.children().not('div.sfProbeDeleteField'), false, true);
	                    } else {
	                        row.remove();
	                        if ($('#sfProbeList').data('nameById')) {
	                            delete $('#sfProbeList').data('nameById')[pId];
	                        }
	                        sfProbeAddButton();
	                        $('#scrollbarAddServerFarm').tinyscrollbar_update();
	                    }
	                },
	                'json'
	            );
	        } else {
	        	inProgress(row.children().not('div.sfRealServerDeleteField'), false, true);
	            $(this).removeClass('working').addClass('button').removeAttr('disabled');
	        }
    	}
    }
    
	function addRealServerRow(realServer) {
        var newRealServerRow = $('#sfRealServerTemplate').clone().attr("id", "sfRealServer" + idDelim + realServer.id);
        newRealServerRow.find('div.sfRealServerNameField').html(realServer.name);
        newRealServerRow.find('div.sfRealServerIpField').html(realServer.ipAddress);
        newRealServerRow.find('div.sfRealServerPortField').html(realServer.port);
        newRealServerRow.find('div.sfRealServerStatusField').html(((realServer.inService)? "In" : "Out of") + " service");
        newRealServerRow.removeClass("sfTemplates").insertBefore($('#sfRealServerTemplate'));
        newRealServerRow.find('a.sfDeleteRealServer').click(sfDeleteRealServer_click);
        $('#sfRealServerList').data('nameById')[realServer.id] = realServer.name;
    }
    
    function addProbeRow(probe) {
        var newProbeRow = $('#sfProbeTemplate').clone().attr("id", "sfProbe" + idDelim + probe.id);
        newProbeRow.find('div.sfProbeNameField').html(probe.name);
        newProbeRow.find('div.sfProbeTypeField').html(probe.type);
        newProbeRow.find('div.sfProbeMethodField').html(probe.requestMethod);
        newProbeRow.find('div.sfProbeIntervalField').html(probe.probeIntervalSeconds);
        newProbeRow.find('div.sfProbeStatusRangeField').html(probe.statusCodeRange);
        newProbeRow.removeClass("sfTemplates").insertBefore('#sfProbeTemplate');
        newProbeRow.find('a.sfDeleteProbe').click(sfDeleteProbe_click);
        $('#sfProbeList').data('nameById')[probe.id] = probe.name;
    }
	
	$('a.editServerFarmButton').click(function() {
		if (!this.disabled) {
		    $('#sfProbeList').data('nameById', {});
            $('#sfRealServerList').data('nameById', {});
            
			// remove any previously-loaded real servers and probes
			$('#sfRealServerList div.sfRealServerRow').not('.heading').not('#sfRealServerTemplate').remove();
			$('#sfProbeList div.sfProbeRow').not('.heading').not('#sfProbeTemplate').remove();
			
			// remove real server and probe creation rows, if they exist
			resetAddSfRealServer();
			resetAddSfProbe();
			
			// change addition buttons to working image
			$('#sfRealServerAddField a.sfAddRealServer').removeClass('button').addClass('working').attr('disabled', 'disabled');
			$('#sfProbeAddField a.sfAddProbe').removeClass('button').addClass('working').attr('disabled', 'disabled');
			
			// hide buttons
			$('#applyServerFarmButton').hide();
			$('#cancelServerFarmButton').hide();
			
			var ids = this.id.split(idDelim);
			var serverFarmId = ids[1];
			var netId = $('#addServerFarmForm').find('input[name="netId"]').val();
			
			var sourceForm = $('#serverFarmValues' + idDelim + serverFarmId);
			$('#modifyingServerFarmId').val(serverFarmId);
			$('#editorServerFarmName').html(sourceForm.find('input[name="name"]').val());
			$('#serverFarmPredictor').val(sourceForm.find('input[name="predictor"]').val());
			
			$.ajax({
				url: "serverfarm/details",
				type: "POST",
				data: { serverFarmId: serverFarmId,
								netId: netId 
				},
				dataType: "json",
				success: function(data) {
					if (data.message && data.message !== "") {
						alert("Unable to retrieve Real Servers and Probes for Server Farm.  " + data.message);
					} else {
						// add real servers to list
						for (var i=0; i<data.serverFarm.realServer.length; i++) {
							addRealServerRow(data.serverFarm.realServer[i]);
						}
						// add probes to list
						for (var i=0; i<data.serverFarm.probe.length; i++) {
							addProbeRow(data.serverFarm.probe[i]);
						}
						$('#scrollbarAddServerFarm').tinyscrollbar_update();
					}
					
					// change addition buttons to normal
					$('#sfRealServerAddField a.sfAddRealServer').removeClass('working').addClass('button');
					sfRsAddButton();
					$('#sfProbeAddField a.sfAddProbe').removeClass('working').addClass('button');
					sfProbeAddButton();
					
					if (!initialized['serverfarmEditor']) {
    					$('#sfRealServerAddField a.sfAddRealServer').click(function() {
    						if (!$(this).attr('disabled')) {
    							$(this).attr('disabled', 'disabled').addClass('disabled');
    							$('#sfRealServerList div.sfRealServerRow').not('.heading,.sfTemplates').find('a.sfDeleteRealServer').attr('disabled', 'disabled').addClass('disabled');
	    					    var currRsList = $('#sfRealServerList').data('nameById');
	    					    var allRsList = $('#realServer_overview').data('nameById');
	    					    $.each(allRsList, function(currId, currName) {
						            addOrIgnoreOption($('#sfNewRsSelectContainer select.sfRealServerIdToAdd'), currRsList, currId, currName);
						        });
	    						$('#sfNewRsSelectContainer select.sfRealServerIdToAdd').dropkick();
	    						
	    						$('#sfNewRsFormWrapper').show();
	    						
	    						if (!initialized['sfNewRsSubmit']) {
		    						$('#sfNewRsSubmit').click(function() {
		    						    if (!$(this).attr('disabled')) {
		    						        $(this).removeClass('button').addClass('working').attr('disabled', 'disabled');
		        						    inProgress($('#sfNewRsFormWrapper').children().not('#sfNewRsSubmitButtonContainer'), true, true);
		        						    var submission = {};
		        						    submission.rsId = $('#sfNewRsSelectContainer select.sfRealServerIdToAdd').val();
		        						    submission.netId = $('#addServerFarmForm').find('input[name="netId"]').val();
		        						    submission.sfId = $('#modifyingServerFarmId').val();
		        						    if ($('input:radio[name="sfNewRsPortRadio"]:checked').val() === 'specific') {
		        						        var currValNum = parseInt($('#sfNewRsPortInput').val().replace(/\D/, '')) || 0;
		                                        var range = getRange($('#sfNewRsPortInput')[0], "serverFarm");
		                                        if (currValNum >= range[0] && currValNum <= range[1]) {
		                                            submission.port = currValNum;
		                                        } else {
		                                            alert('You have selected to specify a port but have not provided a valid value. Please either provide a port number from ' + range[0] +
		                                                '-' + range[1] + ' or change your selection to allow any port.');
		                                            inProgress($('#sfNewRsFormWrapper').children().not('#sfNewRsSubmitButtonContainer'), false, true);
		                                            $(this).removeClass('working').addClass('button').removeAttr('disabled');
		                                            return;
		                                        }
		        						    }
		        						    
		        						    $.post("serverFarm/addRealServer", submission,
		                                        function(data) {
		                                            if (data.message != null && data.message != "") {
		                                                alert(data.message);
		                                            } else {
		                                                var currRsList = $('#sfRealServerList').data('nameById');
		                                                for (i=0; i<data.component.length; i++) {
		                                                    if (!currRsList || !currRsList.hasOwnProperty(data.component[i].id)) {
		                                                        addRealServerRow(data.component[i]);
		                                                    }
		                                                }
		                                            };
		                                            
		                                            resetAddSfRealServer();
		                                        }, 
		                                        "json"
		                                    );
		    						    }		    						    
		    						});
		    						initialized['sfNewRsSubmit'] = true;
	    						}
    						}                            
    					});
    					
    					$('#sfProbeAddField a.sfAddProbe').click(function() {
    						if (!$(this).attr('disabled')) {
    							$(this).attr('disabled', 'disabled').addClass('disabled');
    							$('#sfProbeList div.sfProbeRow').not('.heading,.sfTemplates').find('a.sfDeleteProbe').attr('disabled', 'disabled').addClass('disabled');
	                            var currProbeList = $('#sfProbeList').data('nameById');
	                            var allProbeList = $('#probes_overview').data('nameById');
	                            $.each(allProbeList, function(currId, currName) {
	                                addOrIgnoreOption($('#sfNewProbeToAddContainer select.sfProbeIdToAdd'), currProbeList, currId, currName);
	                            });
	                            
	                            $('#sfNewProbeToAddContainer select.sfProbeIdToAdd').dropkick();
	                            
	                            $('#sfNewProbeFormWrapper').show();
	                            
	                            if (!initialized['sfNewProbeSubmit']) {
		                            $('#sfNewProbeSubmit').click(function() {
		                                if (!$(this).attr('disabled')) {
		                                    $(this).removeClass('button').addClass('working').attr('disabled', 'disabled');
		                                    inProgress($('#sfNewProbeFormWrapper').children().not('#sfNewProbeSubmitButtonContainer'), true, true);
		                                    var submission = {};
		                                    submission.probeId = $('#sfNewProbeToAddContainer select.sfProbeIdToAdd').val();
		                                    submission.netId = $('#addServerFarmForm').find('input[name="netId"]').val();
		                                    submission.sfId = $('#modifyingServerFarmId').val();
		                                    
		                                    $.post("serverFarm/addProbe", submission,
		                                        function(data) {
		                                            if (data.message != null && data.message != "") {
		                                                alert(data.message);
		                                            } else {
		                                                var currProbeList = $('#sfProbeList').data('nameById');
		                                                for (i=0; i<data.component.length; i++) {
		                                                    if (!currProbeList || !currProbeList.hasOwnProperty(data.component[i].id)) {
		                                                        addProbeRow(data.component[i]);
		                                                    }
		                                                }
		                                            };
		                                            
		                                            resetAddSfProbe();
		                                        }, 
		                                        "json"
		                                    );
		                                }
		                                
		                            });
		                            initialized['sfNewProbeSubmit'] = true;
	                            }
    						}
                        });
                        
                        $('a.sfCancelAdd').click(function() {
                            if ($(this).attr('id').toLowerCase().indexOf('probe') !== -1) {
                                resetAddSfProbe();
                            } else {
                                resetAddSfRealServer();
                            }
                        });
                        
                        initialized['serverfarmEditor'] = true;
                    }
				}
			});	
			
			showServerFarmEditor(true);
			$('#scrollbarAddServerFarm').tinyscrollbar_update();
			
			/*
			$("#addServerFarmForm").validate({
		    	onkeyup: false,
		    	errorLabelContainer: '#addServerFarmErrMsg',
		    	wrapper: "li",
				rules: {
					predictor: {
						valid: osValues.serverFarm.validPredictors
					}
				},
				messages: {
					predictor: {
						valid: "Your Server Farm predictor must be one of the following: " + osValues.serverFarm.validPredictors + "."
					}
					
				},
				submitHandler: function(form) {
					inProgress($('#scrollbarAddServerFarm'), true, true);
					$('#addServerFarmErrMsg').html(workingImg(37)).show();
					var formData = "";
					var idData = "";
					var changedFields = {};
					
					var serverFarmId = $('#modifyingServerFarmId').val();
					var initialValFormSelector = '#serverFarmValues' + idDelim + serverFarmId;
					$('#addServerFarmForm').find(':input').not('[disabled]').each(function() {
						if (this.name === "netId" || this.name === "serverFarmId") {
							idData += ((idData == "")? "" : "&") + $(this).serialize();
						} else {
							var inputSelector = 'input[name=' + this.id.replace("Input", "") + ']';
							var initialVal = $(initialValFormSelector).find(inputSelector).val();
							if (!(this.value === initialVal)) {
								formData += ((formData == "")? "" : "&") + $(this).serialize();
								changedFields[this.id.replace("Input", "")] = this.value;
							}
						}
					});
					
					if (formData != "") {
						$("#addServerFarmForm").attr("disabled", "disabled");
						$('#applyServerFarmButton').addClass("disabled").attr("disabled", "disabled");
						
					    $.ajax({
							url: "editServerFarm",
							type: "POST",
							data: formData + "&" + idData,
							dataType: "json",
							success: function(data) {
								if (data.message != null && data.message != "") {
									alert(data.message);
								} else {
									var serverFarm = $('#serverFarmValues' + idDelim + $('#modifyingServerFarmId').val());
									$.each(changedFields, function(key, value) {
										serverFarm.find('input[name=' + key + ']').val(value);
										if (key === "serverFarmIntervalSeconds") {
											$('#' + key + idDelim + $('#modifyingServerFarmId').val()).html(value);
										}
									});
									$('#cancelServerFarmButton').click();
									userMessage($('#serverFarmsMsg'), 'The serverFarm "' + $(initialValFormSelector).find('input[name="name"]').val() + '" has been updated.');
									$('#scrollbarfarms').tinyscrollbar_update();
								}
								inProgress($('#scrollbarAddServerFarm'), false, true);
								$("#addServerFarmForm").removeAttr("disabled");
								$('#applyServerFarmButton').removeClass("disabled").attr("disabled", "disabled");
							},
							error: function(jqXHR, textStatus, errorThrown) {
								alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
								inProgress($('#scrollbarAddServerFarm'), false, true);
								$("#addServerFarmForm").removeAttr("disabled");
								$('#applyServerFarmButton').removeClass("disabled").attr("disabled", "disabled");
							}
						});	
					} else {
						userMessage($('#addServerFarmErrMsg'), "The form cannot be submitted without changes. Please make one or more changes and then submit.");
						inProgress($('#scrollbarAddServerFarm'), false, true);
					}
				}
			});
			*/
		}
	});
	
/*--------------- Persistence Profiles -----------------*/
	// iterate over persistence profiles and store them programmatically in the node so we don't have to do it again
	var allPpList = {};
    $('#persistenceProfile_overview').data('nameById', allPpList);
    $('#persistenceProfile_overview div.listedContainer').not('div.heading').each(function(index) {
        allPpList[$(this).attr('id').split(idDelim)[1]] = $(this).find('span.ppNameText').text();
    });
	
	$('a.deletePersistenceProfileButton').click(function() {
		if (!this.disabled) {
			if (confirm("Are you sure that you want to delete this Persistence Profile?")) {
				var ids = this.id.split(idDelim);
				var ppId = ids[1];
				var netId = ids[2];
				$(this).removeClass('deletePersistenceProfileButton').attr('disabled', 'disabled');
				inProgress($('#listedContainer' + idDelim + ppId), true);
				$.post("persistenceprofile/delete", { 
						netId: netId,
						ppId: ppId
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							$('#deletePersistenceProfileButton' + idDelim + data.id + idDelim + data.netId).addClass('deletePersistenceProfileButton').removeAttr('disabled');
							inProgress($('#listedContainer' + idDelim + data.id), false);
						} else {
							$('#listedContainer' + idDelim + data.id).remove();
							delete $('#persistenceProfile_overview').data('nameById')[data.id];
							userMessage($('#ppMsg'), 'The Persistence Profile has been successfully removed.');
						};					
					}, 
					"json"
				);
			}
		}
	});
	
	var addPpFirstShown = true;
	$('a.addPersistenceProfileButton').click(function() {
		var theForm = $('#addPpForm');
		
		$('#ppName').data('defaultValue', $('#ppName').val());
		$('#ppCookieName').data('defaultValue', $('#ppCookieName').val());
		
		if (addPpFirstShown) {
			$('#scrollbarAddPp').tinyscrollbar();
			
			prepInputField($('#ppName'), false, true, "persistenceProfile");
			prepInputField($('#ppCookieName'), false, true, "persistenceProfile");
			prepInputField($('#ppTimeoutInput'), true, false, "persistenceProfile");
			
			$('#ppNetmaskInput').ipaddress();
			
			// set up timeout field
			$('#upSelector_ppTimeoutInput').mousedown(function() {
		        if (!$('#ppTimeoutInput')[0].disabled) {
					var elem = this;
					deselect();
					var range = getRange(elem, "persistenceProfile");
					arrowClickChangeInputAmt(elem, 1, range);
					intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, 1, range); }, 125);
				}
			}).bind('mouseup mouseleave', function() {
				if (intervalId) {
					clearInterval(intervalId);
				}
		    });
			$('#downSelector_ppTimeoutInput').mousedown(function() {
				if (!$('#ppTimeoutInput')[0].disabled) {
					var elem = this;
					deselect();
					var range = getRange(elem, "persistenceProfile");
					arrowClickChangeInputAmt(elem, -1, range);
					intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, -1, range); }, 125);
				}
			}).bind('mouseup mouseleave', function() {
				if (intervalId) {
					clearInterval(intervalId);
				}
			});
			
			// set up form toggle for pp type change
			$('#dk_container_ppTypeSelect a[data-dk-dropdown-value]').click(function() {
				if ($(this).attr('data-dk-dropdown-value') === osValues.persistenceProfile.type.cookie) {
					$('#netmaskDetails').hide();
					$('#cookieDetails').show();
				} else {
					$('#cookieDetails').hide();
					$('#netmaskDetails').show();
				}
			});
			
			$('#backToPpButton').click(function() {
				$('#overlayAddPpTopContent').hide();
				$('#overlayTabContainer').show();
			});
			
			theForm.validate({
		    	onkeyup: false,
		    	errorLabelContainer: '#addPpErrMsg',
		    	wrapper: "li",
				rules: {
					name: {
						required: true,
						notEqual: $('#ppName').data('defaultValue'),
						maxlength: osValues.persistenceProfile.name.maxLength,
						pattern: osValues.persistenceProfile.name.pattern
					},
					timeoutMinutes: {
						required: true,
						number: true,
						min: osValues.persistenceProfile.ranges.timeoutMinutes[0],
						max: osValues.persistenceProfile.ranges.timeoutMinutes[1]
					},
					cookieName: {
						required: function(elem) {
							return $('#ppTypeSelect').val() === osValues.persistenceProfile.type.cookie;
						},
						notEqual: $('#ppCookieName').data('defaultValue'),
						maxlength: osValues.persistenceProfile.cookie.name.maxLength
					},
					netmask: {
						required: function(elem) {
							return $('#ppTypeSelect').val() === osValues.persistenceProfile.type.netmask;
						},
						ipv4: true
					}
				},
				messages: {
					name: {
						required: "Please provide a name for your Persistence Profile.",
						notEqual: "Please provide a name for your Persistence Profile.",
						maxlength: jQuery.format("The length of the name of the Persistent Profile cannot exceed {0} characters."),
						pattern: "Your Persistence Profile name must be " + osValues.persistenceProfile.name.patternDescriptor + "."
					},
					timeoutMinutes: {
						required: "Please provide a Timeout value in number of minutes.",
						number: "Please provide a Timeout value in number of minutes.",
						min: jQuery.format("The Timeout must be {0} or more minutes."),
						max: jQuery.format("The Timeout must be {0} or fewer minutes.")
					},
					cookieName: {
						required: "Please provide a name for the Cookie.",
						notEqual: "Please provide a name for the Cookie.",
						maxlength: jQuery.format("The length of the name of the Cookie cannot exceed {0} characters.")
					},
					netmask: {
						required: "Please provide a valid Netmask.",
						ipv4: "Please provide a valid Netmask."
					}
					
				},
				submitHandler: function(form) {
					$('#applyPpButton').addClass("disabled").attr("disabled", "disabled");
					$('#cancelPpButton').addClass("disabled").attr("disabled", "disabled");
					
					$(form).addClass('waiting');
					var formData = {};
					formData.name = $('#ppName').val();
					formData.netId = $('#ppNetId').val();
					formData.sfId = $('#sfIdSelect').val();
					formData.timeout = $('#ppTimeoutInput').val();
					formData.type = $('#ppTypeSelect').val();
					
					switch(formData.type) {
					case osValues.persistenceProfile.type.cookie:
						formData.cookieName = $('#ppCookieName').val();
						formData.cookieType = $('#ppCookieType').val();
						break;
					default:
					case osValues.persistenceProfile.type.netmask:
						formData.direction = $('#ppNetmaskDirectionSelect').val();
						formData.netmask = $('#ppNetmaskInput').val();
						break;
					}
					
					inProgress($('#scrollbarAddPp'), true, false);
					
				    $.ajax({
						url: "persistenceprofile/add",
						type: "POST",
						data: formData,
						dataType: "json",
						success: function(data) {
							if (data.message != null && data.message != "") {
								alert(data.message);
							} else {
								var newPp = $('#pp_Template').clone(true);
								newPp.find('span.ppNameText').text(data.component.name);
								newPp.find('div.ppName_Template').removeClass('ppName_Template');
								newPp.find('div.ppSfName_Template').text($('#serverFarms_overview').data('nameById')[data.component.sfId]).removeClass('ppSfName_Template');
								newPp.find('div.ppTimeout_Template').text(data.component.timeout + " Min").removeClass('ppTimeout_Template');
								newPp.find('div.ppType_Template').text(data.component.type).removeClass('ppType_Template');
								newPp.find('a.deletePersistenceProfileButton').attr('id', 'deletePersistenceProfileButton' + idDelim + data.id
										+ idDelim + data.component.netId);
								$("#persistenceProfile_overview").append(newPp);
								newPp.attr('id', 'listedContainer' + idDelim + data.id).removeClass('template');
								$('#persistenceProfile_overview').data('nameById')[data.id] = data.component.name;
								alert("Your Persistence Profile has been added.");
								$('#backToPpButton').click();
								$('#scrollbarpp').tinyscrollbar_update();
							}
							inProgress($('#scrollbarAddPp'), false, false);
							$(form).removeClass('waiting');
							$("#applyPpButton").removeClass("disabled").removeAttr("disabled");
							$('#cancelPpButton').removeClass("disabled").removeAttr("disabled");
						},
						error: function(jqXHR, textStatus, errorThrown) {
							alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
							$(form).removeClass('waiting');
							inProgress($('#scrollbarAddPp'), false, false);
							$("#applyPpButton").removeClass("disabled").removeAttr("disabled");
							$('#cancelPpButton').removeClass("disabled").removeAttr("disabled");
						}
					});					
				}
			});
			
			addPpFirstShown = false;
		}
		
		$('#overlayTabContainer').hide();
		$('#overlayAddPpTopContent').show();
		
		$('#scrollbarAddPp').tinyscrollbar_update();
	});
	
	$('#applyPpButton').click(function() {
		if (!this.disabled) {
			$('#addPpForm').submit();
		}
	});
	
	$('#cancelPpButton').click(function() {
		if (!this.disabled) {
			$('#backToPpButton').click();
		}
	});
	
/*--------------- Vips -----------------*/
	// iterate over Vips and store them programmatically in the node so we don't have to do it again
	var allVipList = {};
    $('#vip_overview').data('nameById', allVipList);
    $('#vip_overview div.listedContainer').not('div.heading').each(function(index) {
    	allVipList[$(this).attr('id').split(idDelim)[1]] = {
			name: $(this).find('span.vipNameText').text(),
			ipAddress: $(this).find('span.vipIpText').text(),
			port: $(this).find('span.vipPortText').text()
    	};
    });
	$('a.deleteVipButton').click(function() {
		if (!this.disabled) {
			if (confirm("Are you sure that you want to delete this VIP?")) {
				var ids = this.id.split(idDelim);
				var vipId = ids[1];
				var netId = ids[2];
				$(this).removeClass('deleteVipButton').attr('disabled', 'disabled');
				inProgress($('#listedContainer' + idDelim + vipId), true);
				$.post("vip/delete", { 
						netId: netId,
						vipId: vipId
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							$('#deleteVipButton' + idDelim + data.id + idDelim + data.netId).addClass('deleteVipButton').removeAttr('disabled');
							inProgress($('#listedContainer' + idDelim + data.id), false);
						} else {
							$('#listedContainer' + idDelim + data.id).remove();
							delete $('#vip_overview').data('nameById')[data.id];
							userMessage($('#vipsMsg'), 'The VIP has been successfully removed.');
						};					
					}, 
					"json"
				);
			}
		}
	});
	
	var addVipFirstShown = true;
	$('a.addVipButton').click(function() {
		var theForm = $('#addVipForm');
		
		$('#addVipName').data('defaultValue', $('#addVipName').val());
		$('#vipCookieName').data('defaultValue', $('#vipCookieName').val());
		
		if (addVipFirstShown) {
			$('#scrollbarAddVip').tinyscrollbar();
			
			prepInputField($('#addVipName'), false, true, "vip");
			prepInputField($('#addVipPortInput'), true, true, "vip");
			
			// set up timeout field
			$('#upSelector_addVipPortInput').mousedown(function() {
		        if (!$('#addVipPortInput')[0].disabled) {
					var elem = this;
					deselect();
					var range = getRange(elem, "vip");
					arrowClickChangeInputAmt(elem, 1, range);
					intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, 1, range); }, 125);
				}
			}).bind('mouseup mouseleave', function() {
				if (intervalId) {
					clearInterval(intervalId);
				}
		    });
			$('#downSelector_addVipPortInput').mousedown(function() {
				if (!$('#addVipPortInput')[0].disabled) {
					var elem = this;
					deselect();
					var range = getRange(elem, "vip");
					arrowClickChangeInputAmt(elem, -1, range);
					intervalId = setInterval(function() { arrowClickChangeInputAmt(elem, -1, range); }, 125);
				}
			}).bind('mouseup mouseleave', function() {
				if (intervalId) {
					clearInterval(intervalId);
				}
			});
			
			$('#backToVipButton').click(function() {
				$('#overlayAddVipTopContent').hide();
				$('#overlayTabContainer').show();
			});
			
			theForm.validate({
		    	onkeyup: false,
		    	errorLabelContainer: '#addVipErrMsg',
		    	wrapper: "li",
				rules: {
					name: {
						required: true,
						notEqual: $('#addVipName').data('defaultValue'),
						maxlength: osValues.vip.name.maxLength,
						pattern: osValues.vip.name.pattern
					},
					protocol: {
						required: true
					},
					ipAddress: {
						required: true
					},
					port: {
						required: true,
						number: true,
						min: osValues.vip.ranges.port[0],
						max: osValues.vip.ranges.port[1],
						notEqual: function(elem) {
							var selectedIpId = $(theForm).find('select[name="ipAddress"]').val();
							if (selectedIpId !== 'new') {
								return $('#vip_overview').data('nameById')[selectedIpId].port;
							}
						}
					},
					vipTargetId: {
						required: true
					},
					inService: {
						required: true,						
					}
					
				},
				messages: {
					name: {
						required: "Please provide a name for your VIP.",
						notEqual: "Please provide a name for your VIP.",
						maxlength: jQuery.format("The length of the name of the VIP cannot exceed {0} characters."),
						pattern: "Your VIP name must be " + osValues.persistenceProfile.name.patternDescriptor + "."
					},
					protocol: {
						required: "Please specify a protocol for your VIP."
					},
					ipAddress: {
						required: "Please specify either the IP address of an existing VIP (using a different port) or to automatically receive a new one now."
					},
					port: {
						required: "Please specify what port this VIP should use.",
						number: "The Port specfied is not a valid port number.",
						min: jQuery.format("The minimum value for the VIP port is {0}."),
						max: jQuery.format("The maximum value for the VIP port is {0}."),
						port: "The IP Address/Port combination that you have specified is in use by another VIP. Please indicate either a different IP Address or a different Port."
					},
					vipTargetId: {
						required: "Please specify a Target for this VIP."
					},
					inService: {
						required: "Please indicate whether or not this VIP should be in service."
					}
					
				},
				submitHandler: function(form) {
					$('#applyVipButton').addClass("disabled").attr("disabled", "disabled");
					$('#cancelVipButton').addClass("disabled").attr("disabled", "disabled");
					
					$(form).addClass('waiting');
					var formData = {};
					$('#addVipIpSelectContainer select[name="ipAddress"]').each(function() {
						if ($(this).val() !== "new") {
							formData.ipAddress = $(this).val();
						}
					});
					formData.netId = $('#addVipNetId').val();
					formData.name = $('#addVipName').val();
					formData.port = $('#addVipPortInput').val();
					formData.protocol = $('#addVipProtocol').val();
					formData.vipTargetType = $('#addVipTargetType').val();
					formData.vipTargetId = $('#vipTargetSelectContainer select[name="vipTargetId"]:enabled').val();
					formData.replyToIcmp = true; // can be added to form and set from there if desired
					formData.inService = $("#vipInServiceContainer input[name='inService']:checked").val();
					
					inProgress($('#scrollbarAddVip'), true, false);
					
				    $.ajax({
						url: "vip/add",
						type: "POST",
						data: formData,
						dataType: "json",
						success: function(data) {
							if (data.message != null && data.message != "") {
								alert(data.message);
							} else {
								var newVip = $('#vip_Template').clone(true);
								newVip.find('span.vipNameText').text(data.component.name);
								newVip.find('div.vipName_Template').removeClass('vipName_Template');
								newVip.find('span.vipIpText').text(data.component.ipAddress);
								newVip.find('div.vipIp_Template').removeClass('vipIp_Template');
								newVip.find('div.vipProtocol_Template').text(data.component.protocol).removeClass('vipProtocol_Template');
								newVip.find('span.vipPortText').text(data.component.port);
								newVip.find('div.vipPort_Template').removeClass('vipPort_Template');
								newVip.find('div.vipReplyToIcmp_Template').text((data.component.replyToIcmp)? "Yes" : "No").removeClass('vipReplyToIcmp_Template');
								newVip.find('div.vipTargetType_Template').text(data.component.vipTargetType).removeClass('vipTargetType_Template');
								newVip.find('div.vipTargetName_Template').text(data.component.vipTargetName).removeClass('vipTargetName_Template');
								newVip.find('a.deleteVipButton').attr('id', 'deleteVipButton' + idDelim + data.id + idDelim + data.netId);
								$("#vip_overview").append(newVip);
								newVip.attr('id', 'listedContainer' + idDelim + data.id).removeClass('template');
								$('#vip_overview').data('nameById')[data.id] = {
									name: data.component.name,
									ipAddress: data.component.ipAddress,
									port: data.component.port
								};
								alert("Your VIP has been added.");
								$('#backToVipButton').click();
								$('#scrollbarvip').tinyscrollbar_update();
							}
							inProgress($('#scrollbarAddVip'), false, false);
							$(form).removeClass('waiting');
							$("#applyVipButton").removeClass("disabled").removeAttr("disabled");
							$('#cancelVipButton').removeClass("disabled").removeAttr("disabled");
						},
						error: function(jqXHR, textStatus, errorThrown) {
							alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
							$(form).removeClass('waiting');
							inProgress($('#scrollbarAddVip'), false, false);
							$("#applyVipButton").removeClass("disabled").removeAttr("disabled");
							$('#cancelVipButton').removeClass("disabled").removeAttr("disabled");
						}
					});					
				}
			});
			
			$('#dk_container_addVipTargetType ul a').click(function() {
				var nameToHide = null, nameToShow = null;
				if ($(this).attr('data-dk-dropdown-value') === osValues.vip.target.values[0]) { // Server Farm
					nameToHide = "vipTargetPpSelect";
					nameToShow = "vipTargetSfSelect";
				} else {
					nameToHide = "vipTargetSfSelect";
					nameToShow = "vipTargetPpSelect";
				}

				$('#vipTargetSelectContainer select[id^="' + nameToHide + '"]').attr('disabled', 'disabled');
				$('#vipTargetSelectContainer div[id^="dk_container_' + nameToHide + '"]').hide();
				$('#vipTargetSelectContainer select[id^="' + nameToShow + '"]').removeAttr('disabled');
				$('#vipTargetSelectContainer div[id^="dk_container_' + nameToShow + '"]').show();
			});
			
			function initializeVipForm() {				
				$('#addVipName').val($('#addVipName').data('defaultValue'));
				$('#dk_container_addVipProtocol a[data-dk-dropdown-value]:first').click();
				$('#addVipPortInput').val(osValues.vip.ranges.port[0]);
				$('#vipInServiceContainer input[name="inService"]:first').click();
				
				// easier to remove old IP select dropdown and start new than to manipulate dropkick box
				$('#addVipIpSelectContainer select').not('#addVipIpSelectTemplate').remove();
				$('#addVipIpSelectContainer div[id^="dk_container"]').remove();
				var newVipIpSelect = $('#addVipIpSelectTemplate').clone(true);
				newVipIpSelect.removeAttr('id').removeClass("template").addClass("default");
				var lastOption = newVipIpSelect.find('option');
				$.each($('#vip_overview').data('nameById'), function(id, values) {
					lastOption = $('<option>' + values.ipAddress + '</option>').insertAfter(lastOption);
				});
				newVipIpSelect.insertAfter('#addVipIpSelectTemplate').show().dropkick();
				
				// rebuild target select dropdowns
				$('#vipTargetSelectContainer div[id^="dk_container"]').remove();
				$('#vipTargetSelectContainer select').each(function () {
					var date = new Date().valueOf();
					var newId = (this.id.indexOf(idDelim) == -1
						 			? this.id
						 			: this.id.split(idDelim)[0]) + idDelim + date;
					this.id = newId;
					var jqSelect = $(this);
					jqSelect.find('option').remove();
					
					var idNameMap = (newId.indexOf("Sf") != -1) 
										? $('#serverFarms_overview').data('nameById')
										: $('#persistenceProfile_overview').data('nameById');
					$.each(idNameMap, function(id, name) {
						$('<option value="' + id + '">' + name + '</option>').appendTo(jqSelect);
					});
					jqSelect.removeData('dropkick');
					jqSelect.dropkick();
					
					$('#dk_container_addVipTargetType li:first a').click();
				});
			}
			
			addVipFirstShown = false;
		}
		
		// initialize necessary fields when form loads
		initializeVipForm();
		
		$('#overlayTabContainer').hide();
		$('#overlayAddVipTopContent').show();
		
		$('#scrollbarAddVip').tinyscrollbar_update();
	});
	
	$('#applyVipButton').click(function() {
		if (!this.disabled) {
			$('#addVipForm').submit();
		}
	});
	
	$('#cancelVipButton').click(function() {
		if (!this.disabled) {
			$('#backToVipButton').click();
		}
	});
}


/*--------------- NatRules -----------------*/
// iterate over NatRules and store them programmatically in the node so we don't have to do it again
/*
var allNatRuleList = {};
$('#natRule_overview').data('natBySource', allNatRuleList);
$('#natRule_overview div.listedContainer').each(function(index) {
	allNatRuleList[$(this).find('span.sourceIpText')] = $(this).find('span.natIpText').text();
});
*/

function initNatRules() {
	$('#scrollbarshort').tinyscrollbar();
	$('.default').dropkick();
	
	$('a.deleteNatRuleButton').click(function() {
		if (!this.disabled) {
			if (confirm("Are you sure that you want to delete this NAT Rule?")) {
				var ids = this.id.split(idDelim);
				var natRuleId = ids[1];
				var netId = ids[2];
				$(this).removeClass('deleteNatRuleButton deleteIPButton').attr('disabled', 'disabled').addClass('disabled');
				inProgress($('#listedContainer' + idDelim + natRuleId), true);
				$.post("natrule/delete", { 
						netId: netId,
						natRuleId: natRuleId
					},
					function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
							$('#deleteVipButton' + idDelim + data.id + idDelim + data.netId).addClass('deleteNatRuleButton deleteIPButton').removeAttr('disabled').removeClass('disabled');
							inProgress($('#listedContainer' + idDelim + data.id), false);
						} else {
							var targetRow = $('#listedContainer' + idDelim + data.id);
							var sourceIp = targetRow.find('span.sourceIpText').text();
							//delete $('#natRule_overview').data('natBySource')[sourceIp];
							targetRow.remove();
							$('#scrollbarshort').tinyscrollbar_update();
							
							var insertionPoint = null;
							var lastOctet = parseInt(sourceIp.split('.')[3]);
							$('#addNatRuleForm option').each(function(index) {
								if (lastOctet < parseInt($(this).val().split('.')[3])) {
									insertionPoint = index;
									$('<option>' + sourceIp + '</option>').insertBefore(this);
									return false;
								}
							});
							if (insertionPoint != null) {
								$('<li><a data-dk-dropdown-value="' + sourceIp + '">' + sourceIp + '</a></li>').insertBefore($('#dk_container_sourceIp li').get(insertionPoint));
							}
							
							userMessage($('#natRuleMsg'), 'The NAT Rule has been successfully removed.');
						};			
					}, 
					"json"
				);
			}
		}
	});
	
	$('#addButton').click(function() {
		if (!this.disabled) {
			$(this).attr("disabled", "disabled").removeClass('button addNatRuleButton').addClass('working');
			inProgress($('#natActionRow').children().not($('div.deleteIconContainer').parent()), true, true);
			
		    $.ajax({
				url: "natrule/add",
				type: "POST",
				data: $("#addNatRuleForm").serialize(),
				dataType: "json",
				success: function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
					} else {
						var newNatRule = $('div.natRule_Template').clone(true);
						newNatRule.find('div.natIp_Template').removeClass('natIp_Template').find('span.natIpText').text(data.rule.natIp);
						newNatRule.find('div.sourceIp_Template').removeClass('sourceIp_Template').find('span.sourceIpText').text(data.rule.sourceIp);
						newNatRule.find('a.deleteNatRuleButton').attr('id', 'deleteButton' + idDelim + data.rule.id + idDelim + data.netId).removeClass('deleteNatRuleButton_Template');
						newNatRule.appendTo($('#natRule_overview')).attr('id', 'listedContainer_' + data.rule.id).removeClass('natRule_Template').removeClass('template');
						
						//$('#natRule_overview').data('natBySource')[data.rule.sourceIp] = data.rule.natIp;
						userMessage($('#addNatRuleMsg'), 'The NAT Rule has been created.');
						$('#scrollbarshort').tinyscrollbar_update();
						$('#addNatRuleForm option').each(function() {
							if (data.rule.sourceIp === $(this).val()) {
								$(this).remove();
								return false;
							}
						});
						$('#dk_container_sourceIp li[class="dk_option_current"]').remove();
						$('#dk_container_sourceIp li a').eq(0).click();
					}
					inProgress($('#natActionRow').children().not($('div.deleteIconContainer').parent()), false, true);
					$('#addButton').removeAttr("disabled").removeClass('working').addClass('button addNatRuleButton');
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					inProgress($('#natActionRow').children().not($('div.deleteIconContainer').parent()), false, true);
					$('#addButton').removeAttr("disabled").removeClass('working').addClass('button addNatRuleButton');
				}
			});
		}
	});
}

function initReports() {
	var dateFormat = 'yy-mm-dd';
	var autoType = "usage";
	
	$('#startDate').datepicker({
		dateFormat: dateFormat,
		showAnim: "drop",
		showOn: "both",
		maxDate: "+0",
		showOptions: {
			direction: "left"
		}
	});
	$('#endDate').datepicker({
		dateFormat: dateFormat,
		showAnim: "drop",
		showOn: "both",
		maxDate: "+0",
		showOptions: {
			direction: "right"
		}
	});
	
	var reports = {};
	reports = {
		currentBill: {
			header: "Current Billing Period",
			description: "Your billing usage for the current billing period is displayed in the table below. You may download the report as a Comma Separated Value (CSV) file by clicking the link above the report.",
			toShow: "reportAutoDisplay",
			type: autoType
		},
		prevBill: {
			header: "Previous Billing Period",
			description: "Your billing usage for the previous billing period is displayed in the table below. You may download the report as a Comma Separated Value (CSV) file by clicking the link above the report.",
			toShow: "reportAutoDisplay",
			type: autoType
		},
		detailedUse: {
			header: "Detailed Usage",
			description: "Select a date range below to download up to " + osValues.report.maxDays + " days of detailed report data. This is a usage report covering all the actions across your account during the supplied period, e.g. creation and deletion of objects. This report can be large if you have a significant number of networks or servers, in which case it is recommended downloading a few days at a time in manageable chunks.",
			type: 'usageDetailed'
		},
		softUnits: {
			header: "Software Units",
			type: 'usageSoftwareUnits'
		},
		adminLogs: {
			header: "Administrator Logs",
			description: "Select a date range below to download up to " + osValues.report.auditlog.maxDays + " days of Administrator Log activity.",
			type: 'auditlog'
		},
		showReport: function(reportId) {
			var report = reports[reportId];
			var targetBlock = '#' + ((report.toShow)? report.toShow : 'reportDatePicker');
			var description = (report.description)? report.description : 'You may download the report as a Comma Separated Value (CSV) file by clicking the "Download" button below.';
			
			$('#reportTypeField').val(report.type);
			$('#reportWindowHeader').text(report.header);
			$('#reportWindowDescription').text(description);
			$('div.reportActionBlock').not(targetBlock).hide();
			$(targetBlock).show();
			$('#mainReportWindow').show();
		},
		resetCalendarEntries: function() {
			$('#startDate').val('');
			$('#endDate').val('');
		}
	};
	
	
	$('a.reportLink').click(function() {
		reports.resetCalendarEntries();
		reports.showReport(this.id);
	});
	
	function downloadReport(url) {
		$('body').append($('<iframe class="downloader" src="' + url + '"></iframe>'));
	}
	
	$('#reportForm').validate({
    	onkeyup: false,
    	onfocusout: false,
    	errorLabelContainer: '#reportErrMsg',
    	wrapper: "li",
		rules: {
			reportType: {
				required: true
			},
			startDate: {
				required: function(elem) {
					return $('#reportTypeField').val() !== autoType;
				},
				date: true
			},
			endDate: {
				required: function(elem) {
					return $('#reportTypeField').val() !== autoType;
				},
				date: true,
				after: 'startDate',
				maxDays: {
					startDateId: 'startDate',
					endDateId: 'endDate',
					reportTypeId: 'reportTypeField'
				}
			}			
		},
		messages: {
			reportType: {
				required: "The report request cannot be submitted due to a missing report type."
			},
			startDate: {
				required: "You must specify a report start date.",
				date: "You must specify a valid report start date."
			},
			endDate: {
				required: "You must specify a report start date.",
				date: "You must specify a valid report start date.",
				after: "The report end date must be the same as or later than the start date.",
				maxDays: "You have specified too many days for this report.  Please correct the range per the instructions and re-submit."
			}			
		},
		submitHandler: function(form) {			
			var formData = $(form).serialize();
			
			if ($('#reportTypeField').val() !== autoType) {
				downloadReport("report/download?" + formData);
			} else {
				$.ajax({
					url: "report/run",
					type: "POST",
					data: formData,
					success: function(data) {
						if (data.message != null && data.message != "") {
							alert(data.message);
						} else {
							
						}
					},
					error: function(jqXHR, textStatus, errorThrown) {
						alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					}
				});		
			}
		}
	});
	
	$('#submitButton').click(function() {
		$('#reportForm').submit();
	});
}

/*--------------- Accounts -----------------*/
function initAccounts() {
	
	function refreshAdminList(refreshDisplay) {
		$.ajax({
			url: "accounts/all",
			type: "GET",
			dataType: "json",
			success: function(data) {
				if (data.message != null && data.message != "") {
					alert(data.message);
				} else {
					var allAdminsList = {};
				    $('#userList').data('accountByUserName', allAdminsList);
				    if (refreshDisplay) {
				    	$('#userList').children('div').not('.userHeader').remove();
				    }
				    $.each(data, function(index, account) {
				    	allAdminsList[account.userName] = account;
				    	if (refreshDisplay) {
				    		$('<div class="section"><div class="cloudUser"><a id="user__' +account.userName + 
				    				'" class="viewAdminLink">' + account.fullName + '</a></div></div>').appendTo('#userList');
				    	}
				    });
				    
				    $('a.viewAdminLink').click(function() {
						var user = $('#userList').data('accountByUserName')[this.id.replace('user__', '')];
						$('#adminFullName').html(user.fullName);
						$('#adminUserName').html(user.userName);
						$('#adminEmail').html(user.emailAddress);
						$('#adminDept').html(user.department);
						$('#adminCustDef1').html(user.customDefined1);
						$('#adminCustDef2').html(user.customDefined2);
						
						var roles = '';
						$.each(user.roles.role, function(index, role) {
							roles += ((index > 0)? ', ' : '') + role.name;
						});
						if (roles === '') {
							roles = "read-only";
						}
						$('#adminRoles').html(roles);
						
						$('#userList').removeClass('open').addClass('closed');
						$('#userView').removeClass('closed').addClass('open');
					});
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
			}
		});
	}
	
	refreshAdminList();
	
	$('#userView').data('clear', function() {
		$('#userView div.info').html('');
	});
	
	$('#addAdminForm').data('clear', function() {
		$('#addAdminForm input').not('#submitAdmin').val('');
	});
	
	$('#yourAccount').data('default', function() {});
	
	$('#manageUsers').data('default', function() {
		$('#userView').data('clear')();
		$('#addAdminForm').data('clear')();
		$('#manageUsers').find('div.subpane').removeClass('open').addClass('closed');
		$('#userList').removeClass('closed').addClass('open');
	});
	
	$('a.navLink').click(function() {
		var targetPane = $('#' + this.id.split(idDelim)[0]);
		targetPane.data('default')();
		$('div.pane').filter('.open').removeClass('open').addClass('closed');
		targetPane.removeClass('closed').addClass('open');		
	});
	
	$('a.navSubLink').click(function() {
		$('div.pane').filter('.open').removeClass('open').addClass('closed');
		var targetSubPane = $('#' + this.id.split(idDelim)[0]);
		targetSubPane.siblings('div.subpane').removeClass('open').addClass('closed');
		targetSubPane.removeClass('closed').addClass('open').closest('div.pane').removeClass('closed').addClass('open');
	});
	
	$('#deleteAdmin').click(function() {
		var adminId = $('#adminUserName').html();
		
		if (confirm('Are you sure that you want to delete this administrator?')) {
			inProgress($('#userView'), true);
			$.ajax({
				url: "accounts/delete",
				type: "POST",
				data: "userId=" + adminId,
				dataType: "json",
				success: function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
					} else {
						alert("The administrator has been removed.");
						var allAdminsList = $('#userList').data('accountByUserName');
						delete allAdminsList[adminId];
						$('#user__' + adminId).closest('div.section').remove();
					}
					inProgress($('#userView'), false);
					$('#manageUsers_link').click();
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					inProgress($('#userView'), false);
				}
			});
		}
	});
	
	$('#addAdminForm').validate({
    	onkeyup: false,
    	errorLabelContainer: '#addAdminErrMsg',
    	wrapper: "li",
		rules: {
			userName: {
				required: true,
				maxlength: osValues.admin.userName.maxLength,
				pattern: osValues.admin.userName.pattern
			},
			firstName: {
				required: true,
				maxlength: osValues.admin.firstName.maxLength
			},
			lastName: {
				required: true,
				maxlength: osValues.admin.lastName.maxLength
			},
			emailAddress: {
				required: true,
				email: true,
				maxlength: osValues.admin.emailAddress.maxLength
			},
			password: {
				required: true,
				minlength: osValues.admin.password.minLength,
				maxlength: osValues.admin.password.maxLength
			},
			passConfirm: {
				equalTo: "#adminPass",						
			},
			department: {
				maxlength: osValues.admin.department.maxLength
			},
			customDefined1: {
				maxlength: osValues.admin.customDefined1.maxLength
			},
			customDefined2: {
				maxlength: osValues.admin.customDefined2.maxLength
			}
		},
		messages: {
			userName: {
				required: "Please provide a user name for the new Administrator.",
				maxlength: jQuery.format("The length of the Administrator user name cannot exceed {0} characters."),
				pattern: "Your Administrator user name must be " + osValues.persistenceProfile.name.patternDescriptor + "."
			},
			firstName: {
				required: "Please provide a first name for the new Administrator.",
				maxlength: jQuery.format("The length of the Administrator first name cannot exceed {0} characters.")
			},
			lastName: {
				required: "Please provide a last name for the new Administrator.",
				maxlength: jQuery.format("The length of the Administrator last name cannot exceed {0} characters.")
			},
			emailAddress: {
				required: "Please provide an email address for the new Administrator.",
				email: "The email address that you have provided is not properly formatted.",
				maxlength: jQuery.format("The length of the email address cannot exceed {0} characters.")
			},
			password: {
				required: "Please provide a password for this new Administrator.",
				minlength: jQuery.format("The length of the Administrator password must be at least {0} characters."),
				maxlength: jQuery.format("The length of the Administrator password cannot exceed {0} characters.")
			},
			passConfirm: {
				equalTo: "The password and confirmation password that you have specified do not match."
			},
			department: {
				maxlength: jQuery.format("The length of the department cannot exceed {0} characters.")
			},
			customDefined1: {
				maxlength: jQuery.format("The length of the Customer Defined 1 field cannot exceed {0} characters.")
			},
			customDefined2: {
				maxlength: jQuery.format("The length of the Customer Defined 2 field cannot exceed {0} characters.")
			}			
		},
		submitHandler: function(form) {
			var formData = $('#addAdminForm').serializeArray();
			inProgress($('#addAdminForm'), true);
			for (var i = 0; i < formData.length; i++) {
				if (formData[i].name === 'passConfirm') {
					formData.splice(i, 1);
					break;
				}
			}
			
			$.ajax({
				url: "accounts/add",
				type: "POST",
				data: formData,
				dataType: "json",
				success: function(data) {
					if (data.message != null && data.message != "") {
						alert(data.message);
					} else {
						alert("The administrator has been added.");
						refreshAdminList(true);
						$('#addAdminForm').data('clear')();
					}
					inProgress($('#addAdminForm'), false);
				},
				error: function(jqXHR, textStatus, errorThrown) {
					alert('ERROR: ' + textStatus + ((errorThrown != null) ? "(" + errorThrown + ")" : ""));
					inProgress($('#addAdminForm'), false);
				}
			});
		}
	});
}