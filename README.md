<p align="center">
  <a href="http://toxcct.free.fr/polars/">
    <img src="favicon.png" alt="VRPolarsChart App Logo" width="192" height="192">
  </a>
</p>

<h3 align="center">VRPolarsChart</h3>

<p align="center">
  The right companion for your <em>virtual regattas</em> on the so called online game.
  <br>
  <br>
  <a href="https://github.com/toxcct/VRPolarsChart/issues/new?template=bug_report.md">Report bug</a>
  ·
  <a href="https://github.com/toxcct/VRPolarsChart/issues/new?template=feature_request.md">Request feature</a>
  ·
  <a href="http://toxcct.free.fr/polars/contact.php">Discuss</a>
</p>


## VRPolarsChart
The **Chart Application** has been developed to display the boats polars of the [Virtual Regatta Offshore](https://www.virtualregatta.com/)<sup>®</sup> online game.
It also provides a custom polars generator for those using third-party routers.


The **Chart Application** provides an _HTTP GET API_ so you can call it from a third party application or from an extension like the [VR Dashboard](https://chrome.google.com/webstore/detail/vr-dashboard/amknkhejaogpekncjekiaolgldbejjan).

However, it is not designed nor expected to be used in real life navigation.


## Table of contents
- [Quick start](#quick-start)
- [Bugs and feature requests](#bugs-and-feature-requests)
- [Documentation](#documentation)
- [HTTP GET API](#http-get-api)
- [Contributing](#contributing)
- [Versioning](#versioning)
- [Copyright and license](#copyright-and-license)


## Quick start
All you have to do is to go to the [VRPolarsChart](http://toxcct.free.fr/polars/) homepage, and then:
- Pick up a race in the upper race selector,
- Select the sails you are currently racing with,
- Select the boat options subscribed,
- Set the _TWS_ (True Wind Speed),
- Drag the blue radius to set the _TWA_ (True Wind Angle),
- Read the Boat Speed.

OR

make your life easy, if you use the [VR Dashboard](https://chrome.google.com/webstore/detail/vr-dashboard/amknkhejaogpekncjekiaolgldbejjan) Chrome Extension, by simply click on the ⛵ icon to get the Polars Chart ready with your actual ingame setup.


## Bugs and feature requests
Have a bug or a feature request? Please first read the [issue guidelines](https://github.com/toxcct/VRPolarsChart/blob/main/.github/CONTRIBUTING.md#using-the-issue-tracker) and search for existing and closed issues. If your problem or idea is not addressed yet, [please open a new issue](https://github.com/toxcct/VRPolarsChart/issues/new).


## Documentation
The Apps come along with an _Help_ section which attempts to describe how to use the Apps and answer the questions I mostly receive.
Before requesting some help, please read the [Help section](http://toxcct.free.fr/polars/help/) and search for answers there first. If your questions remain unanswered, only then contact me [here](http://toxcct.free.fr/polars/contact.php).


## HTTP GET API
The **Chart Application** can be call with HTTP Parameters over its URL.

Accepted URL Parameters :

| Parameter    | Type    | Description                                                                              |
| ------------ | ------- | ---------------------------------------------------------------------------------------- |
| `race_id`    | String  | Set the current race to the race with the provided Id                                    |
| `twa`        | Integer | Set the _TWA_ to the provided value. Rounded to the closest integer                      |
| `tws`        | Decimal | Set the _TWS_ to the provided value. Rounded to the closest hundredth (2 decimal digits) |
| `light`      | Boolean | Set the _Light wind sails_ option to checked                                             |
| `reach`      | Boolean | Set the _Reaching sail_ option to checked                                                |
| `heavy`      | Boolean | Set the _Strong wind sails_ option to checked                                            |
| `foil`       | Boolean | Set the _Foils_ option to checked                                                        |
| `hull`       | Boolean | Set the _Hull polish_ option to checked                                                  |
| `utm_source` | String  | Unique Source Name                                                                       |

_Numerical_ parameters expect the dot character ` . ` as the decimal separator.

_Boolean_ parameters are case insensitive, and considers the following to be _truthy_: `true`, `yes`, `y`, `1`.
    Any other value is _falsy_.


## Contributing

Please read through the [contributing guidelines](https://github.com/toxcct/VRPolarsChart/blob/main/.github/CONTRIBUTING.md). Included are directions for opening issues, coding standards, and notes on development.

All HTML, CSS and Javascript should conform to the [Code Guide](https://github.com/toxcct/VRPolarsChart/blob/main/.github/CODE_GUIDE.md).

Editor preferences are available in the [editor config](https://github.com/toxcct/VRPolarsChart/blob/main/.editorconfig) for easy use in common text editors. Read more and download plugins at <https://editorconfig.org/>.


## Versioning

For transparency into the release cycle and in striving to maintain backward compatibility, The **Polars Chart** and **Polars Generator** Apps are maintained under [the Semantic Versioning guidelines](https://semver.org/).

See [the Releases section of the GitHub project](https://github.com/toxcct/VRPolarsChart/releases) for changelogs for each release version of VRPolarsChart.


## Copyright and license

Code and documentation Copyright 2017–2020 [VRPolarsChart Authors](https://github.com/toxcct/VRPolarsChart/graphs/contributors).
Code and docs released under the [GNU General Public License v3.0](https://github.com/toxcct/VRPolarsChart/blob/main/LICENSE).
