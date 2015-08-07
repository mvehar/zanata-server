import Dispatcher from '../dispatchers/GlossaryDispatcher';
import assign from 'object-assign';
import {EventEmitter} from 'events';
import {Promise} from 'es6-promise';
import Request from 'superagent';
import Configs from '../constants/Configs';
import {GlossaryActionTypes} from '../constants/ActionTypes';
import GlossaryHelper from '../utils/GlossaryHelper'
import StringUtils from '../utils/StringUtils'
import DateHelpers from '../utils/DateHelper'
import _ from 'lodash';

var _state = {
  srcLocaleOptions: [],
  transLocaleOptions: [],
  selectedSrcLocale: null,
  selectedTransLocale: null,
  srcLocales: null,
  transLocales: null,
  glossary: {}
};

var CHANGE_EVENT = "change";

function localesStatAPIUrl() {
  return Configs.baseUrl + "/glossary/locales/list" + Configs.urlPostfix
}

function loadLocalesStats() {
  var url = localesStatAPIUrl();

  return new Promise(function(resolve, reject) {
    Request.get(url)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .set('Accept', 'application/json')
      .set("Pragma", "no-cache")
      .set("Expires", 0)
      .end((function (res) {
        if (res.error) {
          console.error(url, res.status, res.error.toString());
          reject(Error(res.error.toString()));
        } else {
          resolve(res['body']);
        }
      }));
  });
}

function processLocalesStatistic(serverResponse) {
  var srcLocalesMap = {}, srcLocaleOptions = [],
    transLocalesMap = {}, transLocaleOptions = [];

  _.forEach(serverResponse.sourceLocales, function(stats) {
    srcLocalesMap[stats.locale.localeId] = stats;
    srcLocaleOptions.push(stats.locale.displayName);
  });

  _state['selectedSrcLocale'] = srcLocaleOptions[0];
  _state['srcLocaleOptions'] = srcLocaleOptions;
  _state['srcLocales'] = srcLocalesMap;

  _.forEach(serverResponse.translationLocales, function(stats) {
    transLocalesMap[stats.locale.localeId] = stats;
    transLocaleOptions.push(stats.locale.displayName);
  });

  _state['selectedTransLocale'] = transLocaleOptions[0];
  _state['transLocaleOptions'] = transLocaleOptions;
  _state['transLocales'] = transLocalesMap;

  return _state;
}

function glossaryAPIUrl(srcLocale, transLocale) {
  return Configs.baseUrl + "/glossary/src/" + srcLocale + "/trans/" + transLocale + Configs.urlPostfix
}

function loadGlossaryByLocale() {
  var selectedSrcLocaleId =
      GlossaryHelper.getLocaleIdByDisplayName(_state['srcLocales'], _state['selectedSrcLocale']),
     selectedTransLocaleId =
      GlossaryHelper.getLocaleIdByDisplayName(_state['transLocales'], _state['selectedTransLocale']),
      url = glossaryAPIUrl(selectedSrcLocaleId, selectedTransLocaleId);

  return new Promise(function(resolve, reject) {
    Request.get(url)
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .set('Accept', 'application/json')
      .set("Pragma", "no-cache")
      .set("Expires", 0)
      .end((function (res) {
        if (res.error) {
          console.error(url, res.status, res.error.toString());
          reject(Error(res.error.toString()));
        } else {
          resolve(res['body']);
        }
      }));
  });
}

function processGlossaryList(serverResponse) {
  _state['glossary'] = [];
  var transLocaleId = GlossaryHelper.getLocaleIdByDisplayName(_state['transLocales'],  _state['selectedTransLocale']);

  _.forOwn(serverResponse.glossaryEntries, function(entry) {
    var srcTerm =
      GlossaryHelper.getTermByLocale(entry.glossaryTerms, entry.srcLang);

    srcTerm.reference = entry.sourceReference;

    if(!StringUtils.isEmptyOrNull(srcTerm.lastModifiedDate)) {
      srcTerm.lastModifiedDate = DateHelpers.shortDate(DateHelpers.getDate(srcTerm.lastModifiedDate));
    }

    var transTerm =
      GlossaryHelper.getTermByLocale(entry.glossaryTerms, transLocaleId);

    if(!StringUtils.isEmptyOrNull(transTerm.lastModifiedDate)) {
      transTerm.lastModifiedDate = DateHelpers.shortDate(DateHelpers.getDate(transTerm.lastModifiedDate));
    }

    _state['glossary'].push({srcTerm: srcTerm, transTerm: transTerm});
  });

  return _state;
}

/**
 * data: {
 *  resId: term resId
 *  srcLocale: source locale id
 * }
 * @param data
 */
function deleteGlossary(data) {
  var url = Configs.baseUrl + "/glossary/" + data.srcLocale + "/" + data.resId + Configs.urlPostfix;

  return new Promise(function(resolve, reject) {
    Request.del(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end((function (res) {
        if (res.error) {
          console.error(url, res.status, res.error.toString());
          reject(Error(res.error.toString()));
        } else {
          resolve(res['body']);
        }
      }));
  });
}

function saveOrUpdateGlossary(data) {
  //create glossary object from data
  var url = Configs.baseUrl + "/glossary/" + Configs.urlPostfix,
    glossary = GlossaryHelper.generateGlossaryDTO(data);

  return new Promise(function(resolve, reject) {
    Request.post(url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(glossary)
      .end((function (res) {
        if (res.error) {
          console.error(url, res.status, res.error.toString());
          reject(Error(res.error.toString()));
        } else {
          resolve(res['body']);
        }
      }));
  });
}

function processDelete(serverResponse) {
  //show notification?
}

function processSave(serverResponse) {
  //show notification?
}
function initialise () {
  loadLocalesStats()
    .then(processLocalesStatistic)
    .then(function (newState) {
      GlossaryStore.emitChange();
    })
    .then(function() {
      loadGlossaryByLocale()
        .then(processGlossaryList)
        .then(function (newState) {
          GlossaryStore.emitChange();
        });
    });
}

var GlossaryStore = assign({}, EventEmitter.prototype, {
  init: function() {
    if (_state.srcLocales === null) {
      initialise();
    }
    return _state;
  }.bind(this),

  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  dispatchToken: Dispatcher.register(function(payload) {
    var action = payload.action;
    switch (action['actionType']) {
      case GlossaryActionTypes.SRC_LOCALE_SELECTED:
        console.log('source locale from %s -> %s', _state['selectedSrcLocale'], action.data);
        _state['selectedSrcLocale'] = action.data;
        loadGlossaryByLocale()
          .then(processGlossaryList)
          .then(function (newState) {
            GlossaryStore.emitChange();
          });
        break;
      case GlossaryActionTypes.TRANS_LOCALE_SELECTED:
        console.log('translation locale from %s -> %s', _state['selectedTransLocale'], action.data);
        _state['selectedTransLocale'] = action.data;
        loadGlossaryByLocale()
          .then(processGlossaryList)
          .then(function (newState) {
            GlossaryStore.emitChange();
          });
        break;
      case GlossaryActionTypes.INSERT_GLOSSARY:
      case GlossaryActionTypes.UPDATE_GLOSSARY:
        console.log('save/update glossary', action.data);
        saveOrUpdateGlossary(action.data)
          .then(processSave)
          .then(function () {
            initialise();
          });
        break;
      case GlossaryActionTypes.DELETE_GLOSSARY:
        //glossary resId with srcLocale
        console.log('deleting glossary', action.data);
        deleteGlossary(action.data)
          .then(processDelete)
          .then(function () {
            initialise();
          });
        break;
    }
  })
});

export default GlossaryStore;