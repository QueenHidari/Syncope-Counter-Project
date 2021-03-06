import React, { Component } from 'react'
import {
  Text,
  View,
  Button,
  DrawerLayoutAndroid,
  StyleSheet,
  Navigator
} from 'react-native'
import EventScreen from './EventScreen'
import AddEvents from './AddEvents'
import ActionButton from 'react-native-action-button'
import Icon from 'react-native-vector-icons/Ionicons'
import Moment from 'moment'
import uuidV4 from 'uuid'
import BluetoothScreen from './BluetoothScreen'
import { BleManager } from 'react-native-ble-plx'
import Tab from 'react-native-tab-xg'

class App extends Component {
  constructor (props) {
    super(props)
    this.state = {
      date: Moment().format('YYYY-MM-DD HH:mm'),
      events: [],
      navigator: null,
      title: 'add',
      key: 1
    }

    this.manager = new BleManager()
    this.toAdd =  this.toAdd.bind(this)
    this.toEvents = this.toEvents.bind(this)
    this.toSettings = this.toSettings.bind(this)
    this.itemList = [
      {
        key: 'add',
        title: 'add',
        icon: <Icon
                name="md-add"
                style={{fontSize: 20, margin: 5, marginLeft: 10, color: '#FF6B6B'}}
              />,
        onPress: this.toAdd
      },
      {
        key: 'events',
        title: 'events',
        icon: <Icon
                name="md-calendar"
                style={{fontSize: 20, margin: 5, marginLeft: 10, color: '#FF6B6B'}}
              />,
        onPress: this.toEvents
      },
      {
        key: 'settings',
        title: 'settings',
        icon: <Icon
                name="md-settings"
                style={{fontSize: 20, margin: 5, marginLeft: 10, color: '#FF6B6B'}}
              />,
        onPress: this.toSettings
      }
    ]
  }
  toAdd () {
    this.setState({title: 'add', key: 1});
  }
  toEvents () {
    this.setState({title: 'events', key: 2});
  }
  toSettings () {
    this.setState({title: 'settings', key: 3});
  }
  info (message) {
    console.log(message)
    this.setState({info: message})
  }

  error (message) {
    console.log(message)
    this.setState({info: 'ERROR: ' + message})
  }

  updateValue (key, value) {
    console.log(message)
    this.setState({values: {...this.state.values, [key]: value}})
  }

  scanAndConnect () {
    this.manager.startDeviceScan(null, null, (error, device) => {
      this.info('Scanning...')
      console.log(device)

      if (error) {
        this.error(error.message)
        return
      }

      if (device.name === 'Adafruit Bluefruit LE') {
        this.info('Connecting to Arduino')
        this.manager.stopDeviceScan()
        device.connect()
          .then((device) => {
            this.info('Discovering services and characteristics')
            return device.discoverAllServicesAndCharacteristics()
          })
          .then((device) => {
            this.info('Setting notifications')
            return this.setupNotifications(device)
          })
          .then(() => {
            this.info('Listening...')
          }, (error) => {
            this.error(error.message)
          })
      }
    })
  }

  onDateTimeSelect (date) {
    console.log('date set: ' + date)
    this.setState({date: date})
  }
  onChangeText (text) {
    this.setState({symptom: text})
  }
  onAddEvent () {
    this.setState((prevState, props) => {
      return {
        events: [
          ...prevState.events,
          {
            id: uuidV4(),
            date: prevState.date,
            symptom: prevState.symptom
          }
        ]
      }
    })
  }

  async setupNotifications(device) {
    for (const id in this.sensors) {
      const service = this.serviceUUID(id)
      const characteristicW = this.writeUUID(id)
      const characteristicN = this.notifyUUID(id)

      const characteristic = await device.writeCharacteristicWithResponseForService(
        service, characteristicW, "AQ==" /* 0x01 in hex */
      )

      device.monitorCharacteristicForService(service, characteristicN, (error, characteristic) => {
        if (error) {
          this.error(error.message)
          return
        }
        this.updateValue(characteristic.uuid, characteristic.value)
      })
    }
  }
  componentWillMount() {
    this.manager = new BleManager();
    this.subscriptions = {}
    this.manager.onStateChange((newState) => {
      console.log("State changed: " + newState)
    })
  }
  render () {
    return (
      <View style={{flex: 1, backgroundColor: '#f3f3f3', flexGrow: 1}}>
        <Navigator
          initialRoute={{ index: 0 }}
          renderScene={(route, navigator) => {
            if (this.state.key === 1) {
              return  <AddEvents
                        onDateTimeSelect={(date) => this.onDateTimeSelect(date)}
                        onChangeText={(text) => this.onChangeText(text)}
                        onAddEvent={() => this.onAddEvent()}
                        dateTimeSelected={this.state.date}
                        events={this.state.events}
                        onConnectPress={() => {
                          this.scanAndConnect()
                        }}
                      />
            } else if (this.state.key === 2) {
              return  <EventScreen
                        events={this.state.events}
                      />
            }
          }}
        />
        <Text>{this.state.title}</Text>
        <Tab
          active={this.state.title}
          itemList={this.itemList}
        />
        {/*}
        <ActionButton buttonColor="rgba(231,76,60,1)">
          <ActionButton.Item
            buttonColor="#88d498"
            title="New Event"
            onPress={() => this.onAddEvent('syncope')}
            >
            <Icon name="create" style={styles.actionButtonIcon} />
          </ActionButton.Item>
        </ActionButton>
        {*/}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  navTitle: {
    height: 40,
    backgroundColor: '#282828'
  },
  actionButtonIcon: {
    fontSize: 20,
    height: 22,
    color: 'white'
  },
  navButtons: {
    flex: 1,
    height: 10
  }
})

export default App
