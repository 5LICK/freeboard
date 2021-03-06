// # A Freeboard Plugin that uses the Eclipse Paho javascript client to read MQTT messages

(function()
{
	// ### Datasource Definition
	// Please replace the external_scripts location with a local replica of the Paho MQTT client when possible
	// -------------------
	freeboard.loadDatasourcePlugin({
		"type_name"   : "paho_mqtt",
		"display_name": "Paho MQTT",
        "description" : "Receive data from an MQTT server.",
		"external_scripts" : [
			"plugins/thirdparty/paho-mqtt-min.js"
		],
		"settings"    : [
			{
				"name"         : "server",
				"display_name" : "MQTT Server",
				"type"         : "text",
				"description"  : "Hostname for your MQTT Server",
                "required" : true
			},
			{
				"name"        : "port",
				"display_name": "Port",
				"type"        : "number", 
				"description" : "The port to connect to the MQTT Server on",
				"required"    : true
			},
			{
				"name"        : "use_ssl",
				"display_name": "Use SSL",
				"type"        : "boolean",
				"description" : "Use SSL/TLS to connect to the MQTT Server",
				"default_value": true
			},
            {
            	"name"        : "client_id",
            	"display_name": "Client Id",
            	"type"        : "text",
            	"default_value": "",
            	"required"    : false
            },
            {
            	"name"        : "username",
            	"display_name": "Username",
            	"type"        : "text",
            	"default_value": "",
            	"required"    : false
            },
            {
            	"name"        : "password",
            	"display_name": "Password",
            	"type"        : "text",
            	"default_value": "",
            	"required"    : false
            },
			{
				"name"        : "topics",
				"display_name": "Topics",
				"type"        : "array",
				"description" : "List of topics to subscribe to",
				"required"    : true,
				"settings"    : [
					{
						"name"        : "topic",
						"display_name": "Topic",
						"type"        : "text",
						"description" : "The topic to subscribe to",
						"required"    : true
					},
					{
						"name"        : "short_name",
						"display_name": "Short name",
						"type"        : "text",
						"description" : "Short name in the data source context",
						"required"    : false
					},
				]
			},
            {
            	"name"        : "json_data",
            	"display_name": "JSON messages?",
            	"type"        : "boolean",
            	"description" : "If the messages on your topic are in JSON format they will be parsed so the individual fields can be used in freeboard widgets",
            	"default_value": false
            }
		],
		// **newInstance(settings, newInstanceCallback, updateCallback)** (required) : A function that will be called when a new instance of this plugin is requested.
		// * **settings** : A javascript object with the initial settings set by the user. The names of the properties in the object will correspond to the setting names defined above.
		// * **newInstanceCallback** : A callback function that you'll call when the new instance of the plugin is ready. This function expects a single argument, which is the new instance of your plugin object.
		// * **updateCallback** : A callback function that you'll call if and when your datasource has an update for freeboard to recalculate. This function expects a single parameter which is a javascript object with the new, updated data. You should hold on to this reference and call it when needed.
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback(new mqttDatasourcePlugin(settings, updateCallback));
		}
	});

	var mqttDatasourcePlugin = function(settings, updateCallback)
	{
 		var self = this;
 		var client;
		var data = {};

		var currentSettings = settings;

		function onConnect() {
			console.log("Connected to MQTT server");

			_.each(currentSettings.topics, function (t) {
				client.subscribe(t.topic);
			});
		}
		
		function onConnectionLost(responseObject) {
			if (responseObject.errorCode !== 0)
				console.log("onConnectionLost:"+responseObject.errorMessage);
		}

		function onMessageArrived(message) {
			var newData = {};
			var topicName;

			//console.log("Message" + "(" + message.destinationName + "): " + JSON.stringify(message));
			newData.topic = message.destinationName;
			if (currentSettings.json_data) {
				newData.msg = JSON.parse(message.payloadString);
			} else {
				newData.msg = message.payloadString;
			}

			var topicInfo = _.find(currentSettings.topics, function (t) { return t.topic === newData.topic });
			if(!topicInfo) {
				console.log("Error: Unknown topic");
				return;
			}
			topicName = (topicInfo.short_name) ? topicInfo.short_name : topicInfo.topic;
			data[topicName] = newData;

			updateCallback(data);
		}

		self.onSettingsChanged = function(newSettings)
		{
			if(client.isConnected()) {
				client.disconnect();
			}
			data = {};
			currentSettings = newSettings;
			client.connect({onSuccess:onConnect,
							userName: currentSettings.username,
							password: currentSettings.password,
							useSSL: currentSettings.use_ssl});
		};

		// **updateNow()** (required) : A public function we must implement that will be called when the user wants to manually refresh the datasource
		self.updateNow = function()
		{
			if(client.isConnected()) {
				client.disconnect();
			}
			data = {};
			client.connect({onSuccess:onConnect,
				userName: currentSettings.username,
				password: currentSettings.password,
				useSSL: currentSettings.use_ssl});
		};

		// **onDispose()** (required) : A public function we must implement that will be called when this instance of this plugin is no longer needed. Do anything you need to cleanup after yourself here.
		self.onDispose = function()
		{
			if (client.isConnected()) {
				client.disconnect();
			}
			client = {};
		};

		client = new Paho.Client(currentSettings.server,
										currentSettings.port, 
										currentSettings.client_id);
		client.onConnectionLost = onConnectionLost;
		client.onMessageArrived = onMessageArrived;
	}
}());
