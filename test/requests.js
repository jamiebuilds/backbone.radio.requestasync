describe('Requests:', function() {
  beforeEach(function() {
    this.Requests = _.clone(Radio.Requests);
    spy(this.Requests, 'requestAsync');
  });

  describe('when making a request that has no handler', function() {
    beforeEach(function() {
      this.promiseCallback = stub();
      return this.Requests.requestAsync('unhandledEvent')
        .catch(this.promiseCallback);
    });

    it('should not return anything.', function() {
      return expect(this.Requests.requestAsync('unhandledEvent'))
        .to.eventually.be.rejected;
    });

    describe('but has a "default" handler', function() {
      beforeEach(function() {
        this.callback = stub();
        this.Requests.reply('default', this.callback);
        return this.Requests.requestAsync('unhandledEvent', 'argOne', 'argTwo');
      });

      it('should pass along the arguments to the "default" handler.', function() {
        expect(this.callback)
          .to.have.been.calledOnce
          .and.calledWithExactly('unhandledEvent', 'argOne', 'argTwo');
      });
    });
  });

  describe('when making a request that has a handler', function() {
    beforeEach(function() {
      this.callback = stub().returns('myResponse');
    });

    describe('and no context', function() {
      beforeEach(function() {
        this.promiseCallback = stub();
        this.Requests.reply('myRequest', this.callback);
        return this.Requests.requestAsync('myRequest', 'argOne', 'argTwo')
          .then(this.promiseCallback);
      });

      it('should pass along the arguments to the handler.', function() {
        expect(this.callback)
          .to.have.been.calledOnce
          .and.calledWithExactly('argOne', 'argTwo');
      });

      it('should return the value of the handler from `request`.', function() {
        expect(this.promiseCallback)
          .to.have.been.calledWith('myResponse');
      });

      it('should be called with the Requests object as the context', function() {
        expect(this.callback).to.have.always.been.calledOn(this.Requests);
      });
    });

    describe('and a context', function() {
      beforeEach(function() {
        this.promiseCallback = stub();
        this.context = {};
        this.Requests.reply('myRequest', this.callback, this.context);
        return this.Requests.requestAsync('myRequest', 'argOne', 'argTwo')
          .then(this.promiseCallback);
      });

      it('should pass along the arguments to the handler.', function() {
        expect(this.callback)
          .to.have.been.calledOnce
          .and.calledWithExactly('argOne', 'argTwo');
      });

      it('should resolve the value of the handler from `requestAsync`.', function() {
        expect(this.promiseCallback)
          .to.have.been.calledWithExactly('myResponse');
      });

      it('should be called with the correct context', function() {
        expect(this.callback).to.have.always.been.calledOn(this.context);
      });
    });

    describe('with many arguments', function() {
      beforeEach(function() {
        this.context = {};
        this.Requests.reply('myRequest', this.callback, this.context);
        return this.Requests.requestAsync('myRequest', 'argOne', 'argTwo', 'argThree', 'argFour', 'argFive');
      });

      it('should pass all of the arguments', function() {
        expect(this.callback)
          .to.have.been.calledOnce
          .and.calledWithExactly('argOne', 'argTwo', 'argThree', 'argFour', 'argFive');
      });
    });
  });

  describe('when making a request multiple times that has a handler', function() {
    beforeEach(function() {
      this.callback = stub().returns('myResponse');
      this.Requests.reply('myRequest', this.callback);
      return Promise.all([
        this.Requests.requestAsync('myRequest', 'argOne', 'argTwo'),
        this.Requests.requestAsync('myRequest', 'argOne'),
        this.Requests.requestAsync('myRequest', 'argTwo')
      ]);
    });

    it('should always return the value of the handler from `requestAsync`.', function() {
      expect(this.callback)
        .to.have.been.calledThrice
        .and.to.have.been.calledWithExactly('argOne', 'argTwo')
        .and.to.have.always.returned('myResponse');
    });

    describe('and has a "default" handler', function() {
      beforeEach(function() {
        this.defaultCallback = stub();
        this.Requests.reply('default', this.defaultCallback);
        return this.Requests.requestAsync('myRequest', 'argTwo');
      });

      it('should not call the "default" handler', function() {
        expect(this.defaultCallback).not.have.been.called;
      });
    });
  });

  describe('when making a request multiple times that has a `once` handler', function() {
    beforeEach(function() {
      this.callback = stub().returns('myResponse');
      this.Requests.replyOnce('myRequest', this.callback);
    });

    describe('and has no "default" handler', function() {
      beforeEach(function() {
        this.promiseCallback = stub();
        return Promise.all([
          this.Requests.requestAsync('myRequest', 'argOne').then(this.promiseCallback),
          this.Requests.requestAsync('myRequest', 'argTwo').catch(this.promiseCallback),
          this.Requests.requestAsync('myRequest', 'argTwo', 'argOne').catch(this.promiseCallback)
        ]);
      });

      it('should call the handler just once.', function() {
        expect(this.callback)
          .to.have.been.calledOnce
          .and.to.have.been.calledWithExactly('argOne');
      });

      it('should return the value of the handler once for `request`.', function() {
        expect(this.promiseCallback)
          .to.have.been.calledWithExactly('myResponse')
          .and.calledWithExactly(new Error('An unhandled async request was fired: "myRequest"'))
          .and.calledWithExactly(new Error('An unhandled async request was fired: "myRequest"'));
      });
    });

    describe('and has a "default" handler', function() {
      beforeEach(function() {
        this.defaultCallback = stub();
        this.Requests.reply('default', this.defaultCallback);

        return Promise.all([
          this.Requests.requestAsync('myRequest', 'argOne', 'argTwo'),
          this.Requests.requestAsync('myRequest', 'argOne'),
          this.Requests.requestAsync('myRequest', 'argTwo')
        ]);
      });

      it('should call the "default" handler for subsequent calls', function() {
        expect(this.defaultCallback)
          .to.have.been.calledTwice
          .and.calledAfter(this.callback)
          .and.calledWithExactly('myRequest', 'argOne')
          .and.calledWithExactly('myRequest', 'argTwo');
      });
    });
  });

  describe('when making a request that has a `once` handler & a context', function() {
    beforeEach(function() {
      this.context = {};
      this.callback = stub().returns('myResponse');
      this.promiseCallback = stub();

      this.Requests.replyOnce('myRequest', this.callback, this.context);
      return this.Requests.requestAsync('myRequest', 'argOne', 'argTwo').then(this.promiseCallback);
    });

    it('should pass along the arguments to the handler.', function() {
      expect(this.callback)
        .to.have.been.calledOnce
        .and.calledWithExactly('argOne', 'argTwo');
    });

    it('should return the value of the handler from `request`.', function() {
      expect(this.promiseCallback)
        .to.have.been.calledWithExactly('myResponse');
    });

    it('should be called with the correct context', function() {
      expect(this.callback).to.have.always.been.calledOn(this.context);
    });
  });

  describe('when making a request that has a flat value as a handler', function() {
    beforeEach(function() {
      this.Requests.reply('myRequest', 'myResponse');
    });

    it('should return that value.', function() {
      expect(this.Requests.requestAsync('myRequest'))
        .to.eventually.equal('myResponse');
    });
  });

  describe('when calling `request` with object', function() {
    beforeEach(function() {
      this.promiseCallback = stub();
      this.Requests.reply('requestOne', 'replyOne');
      this.Requests.reply('requestTwo', 'replyTwo');
      return this.Requests.requestAsync({
        'requestOne' : 'argOne',
        'requestTwo' : 'argTwo'
      }).then(this.promiseCallback);
    });

    it('should call the set of requests', function() {
      expect(this.Requests.requestAsync)
        .to.have.been.calledThrice
        .and.calledWith('requestOne', 'argOne')
        .and.calledWith('requestTwo', 'argTwo');
    });

    it('should return an object of replies', function() {
      expect(this.promiseCallback)
        .to.have.been.calledWithExactly({
          requestOne: 'replyOne',
          requestTwo: 'replyTwo'
        });
    });
  });

  describe('when calling `request` with space-separated requests', function() {
    beforeEach(function() {
      this.promiseCallback = stub();
      this.Requests.reply('requestOne', 'replyOne');
      this.Requests.reply('requestTwo', 'replyTwo');
      return this.Requests.requestAsync('requestOne requestTwo', 'argOne', 'argTwo')
        .then(this.promiseCallback);
    });

    it('should call `request` with the correct requests', function() {
      expect(this.Requests.requestAsync)
        .to.have.been.calledThrice
        .and.calledWith('requestOne', 'argOne', 'argTwo')
        .and.calledWith('requestTwo', 'argOne', 'argTwo');
    });

    it('should return an object of replies', function() {
      expect(this.promiseCallback)
        .to.have.been.calledWithExactly({
          requestOne: 'replyOne',
          requestTwo: 'replyTwo'
        });
    });
  });

  describe.skip('when calling `request` with object with space-separated keys of requests', function() {
    beforeEach(function() {
      this.promiseCallback = stub();
      this.Requests.reply('requestOne', 'replyOne');
      this.Requests.reply('requestTwo', 'replyTwo');
      this.Requests.reply('requestThree', 'replyThree');
      return this.Requests.requestAsync({
        'requestOne requestTwo' : 'argOne',
        'requestThree' : 'argTwo'
      }).then(this.promiseCallback);
    });

    it('should call the set of requests', function() {
      expect(this.Requests.requestAsync)
        .to.have.callCount(5)
        .and.calledWith('requestOne', 'argOne')
        .and.calledWith('requestTwo', 'argOne')
        .and.calledWith('requestThree', 'argTwo');
    });

    it('should return an object of replies', function() {
      expect(this.promiseCallback)
        .to.have.been.calledWithExactly({
          requestOne: 'replyOne',
          requestTwo: 'replyTwo',
          requestThree: 'replyThree'
        });
    });
  });

  describe.skip('when calling `request` with object with space-separated keys of requests with matching with matching keys', function() {
    beforeEach(function() {
      this.promiseCallback = stub();
      this.Requests.reply('requestOne requestTwo', _.identity);
      return this.Requests.requestAsync({
        'requestOne requestTwo' : 'argOne',
        'requestTwo' : 'argTwo'
      }).then(this.promiseCallback);
    });

    it('should call the set of requests', function() {
      expect(this.Requests.requestAsync)
        .to.have.callCount(5)
        .and.calledWith('requestOne', 'argOne')
        .and.calledWith('requestTwo', 'argOne')
        .and.calledWith('requestTwo', 'argTwo');
    });

    it('should return an object of replies override duplicate keys', function() {
      expect(this.promiseCallback)
        .to.have.been.calledWithExactly({
          requestOne: 'argOne',
          requestTwo: 'argTwo'
        });
    });
  });
});
