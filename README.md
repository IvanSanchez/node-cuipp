node-cuipp
===============


What?
------------

**node-cuipp** is a *node.js* interface to *Cisco Unified IP Phone* services. If you have a fancy Cisco IP phone, this will help to show things on the screen and make the phone visit some URIs.


Why?
----------

Because I'm sick and tired of Cisco's examples, usually involving manually-typed XML, snippets of C code, and complete lack of library use.

I based myself on the "Cisco Unified IP Phone Services Application Development Notes (Supporting XML Applications) Release 9.1(1)" document.



How? (do I use it)
---------------------

Check *examples_pull.js* and *examples_push.js* for a basic set of sample commands.

The API is a bit weird in the sense that the phones have both a HTTP client and a HTTP server, and (almost) any payload can be either sent to the HTTP server or received from the HTTP client.

e.g. we can push a payload ot the phone via cuipp.send(phone,cuipp.text(foo)), but if the phone makes a HTTP request to a Node web server, and that server returns cuipp.text(phone.foo), then the result is exactly the same.

For *examples_push.js*, you can use *fakePhone.js* to test it out. For *examples_pull.js*, you can use a web browser and read through the payloads and change URLs yourself.



